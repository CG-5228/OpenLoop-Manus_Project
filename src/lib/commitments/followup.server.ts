/**
 * Server-side follow-up generation via an OpenAI-compatible Chat Completions
 * API. SERVER ONLY — reads credentials from environment variables, which are
 * never exposed to the browser (no NEXT_PUBLIC_ prefix).
 *
 * Environment variables (same names as the team's AI handoff doc):
 *   OPENAI_API_KEY          required for AI drafts
 *   OPENAI_BASE_URL         optional, default https://api.openai.com/v1
 *                           (OPENAI_API_BASE is also accepted)
 *   OPENAI_FOLLOWUP_MODEL   optional, falls back to OPENAI_MODEL, then "gpt-5-mini"
 *
 * Failure policy (README "API contracts"): no made-up success. Missing
 * credentials → FollowUpUnavailableError(503); provider failure or unusable
 * output → FollowUpUnavailableError(502). A labelled template is returned
 * instead ONLY when the caller opts in with `allowTemplate: true`.
 *
 * INTEGRATION NOTE: if the team adds a shared AI client (Member 3 / 5),
 * replace `callChatCompletions` with it — the rest of this file is provider-agnostic.
 */

import type { Commitment, FollowUpResponse, FollowUpTone } from "./types";
import {
  buildFollowUpFacts,
  FOLLOW_UP_RESPONSE_FORMAT,
  FOLLOW_UP_SYSTEM_PROMPT,
  sanitizeFollowUp,
  templateFollowUp,
} from "./followup";

export interface AiConfig {
  apiKey: string | null;
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

type Env = Record<string, string | undefined>;

export function getAiConfig(env: Env = process.env): AiConfig {
  return {
    apiKey: env.OPENAI_API_KEY?.trim() || null,
    baseUrl: (env.OPENAI_BASE_URL || env.OPENAI_API_BASE || "https://api.openai.com/v1")
      .trim()
      .replace(/\/+$/, ""),
    model: (env.OPENAI_FOLLOWUP_MODEL || env.OPENAI_MODEL || "gpt-5-mini").trim(),
    timeoutMs: 20_000,
  };
}

export interface GenerateFollowUpInput {
  commitment: Commitment;
  tone: FollowUpTone;
  currentUserLabel: string | null;
  now: Date;
  /** Return a labelled template instead of an error when AI is unavailable. */
  allowTemplate?: boolean;
}

/** AI could not produce a draft. `status` is the HTTP status the route should use. */
export class FollowUpUnavailableError extends Error {
  constructor(
    message: string,
    readonly status: 502 | 503,
    readonly code: "not_configured" | "provider_error" | "unusable_output",
  ) {
    super(message);
    this.name = "FollowUpUnavailableError";
  }
}

class AiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = "AiRequestError";
  }
}

function buildBody(model: string, userContent: string, compat: boolean): Record<string, unknown> {
  const isOpenAiFamily = /^(gpt-|o\d)/i.test(model);
  const isReasoningModel = /^(gpt-5|o\d)/i.test(model);
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: FOLLOW_UP_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  };
  if (isOpenAiFamily) body.max_completion_tokens = isReasoningModel ? 1000 : 300;
  else body.max_tokens = 1024;
  if (!compat) {
    body.response_format = FOLLOW_UP_RESPONSE_FORMAT;
    // Short creative task: skip deep reasoning to keep latency ~1s.
    if (isReasoningModel) body.reasoning_effort = "minimal";
  }
  return body;
}

async function callChatCompletions(
  config: AiConfig,
  body: Record<string, unknown>,
  fetchImpl: typeof fetch,
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const res = await fetchImpl(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new AiRequestError(`AI provider returned ${res.status}: ${detail.slice(0, 300)}`, res.status);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string | null } }[];
    };
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    if (err instanceof AiRequestError) throw err;
    if ((err as Error)?.name === "AbortError") throw new AiRequestError("AI request timed out", null);
    throw new AiRequestError(`AI request failed: ${(err as Error)?.message ?? String(err)}`, null);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Generate a follow-up draft with real AI.
 * Throws FollowUpUnavailableError when AI can't deliver, unless
 * `input.allowTemplate` is true (then returns a `source: "template"` draft
 * with a `notice` the UI must display).
 */
export async function generateFollowUp(
  input: GenerateFollowUpInput,
  config: AiConfig = getAiConfig(),
  fetchImpl: typeof fetch = fetch,
): Promise<FollowUpResponse> {
  const opts = { currentUserLabel: input.currentUserLabel, now: input.now, tone: input.tone };
  const unavailable = (err: FollowUpUnavailableError): FollowUpResponse => {
    if (!input.allowTemplate) throw err;
    return {
      message: templateFollowUp(input.commitment, opts),
      source: "template",
      model: null,
      notice: `${err.message} This is a template draft, not AI — please review before sending.`,
    };
  };

  if (!config.apiKey) {
    return unavailable(
      new FollowUpUnavailableError(
        "AI follow-ups aren't configured on this server.",
        503,
        "not_configured",
      ),
    );
  }

  const userContent = JSON.stringify(buildFollowUpFacts(input.commitment, opts), null, 2);

  let content: string | null;
  try {
    try {
      content = await callChatCompletions(config, buildBody(config.model, userContent, false), fetchImpl);
    } catch (err) {
      // Some providers/models reject response_format or reasoning_effort: retry once plainly.
      if (err instanceof AiRequestError && err.status === 400) {
        content = await callChatCompletions(config, buildBody(config.model, userContent, true), fetchImpl);
      } else {
        throw err;
      }
    }
  } catch (err) {
    console.error("[follow-up] AI generation failed:", (err as Error).message);
    return unavailable(
      new FollowUpUnavailableError(
        "The AI service couldn't draft a follow-up right now. Please try again.",
        502,
        "provider_error",
      ),
    );
  }

  const message = sanitizeFollowUp(content);
  if (!message) {
    return unavailable(
      new FollowUpUnavailableError(
        "The AI returned a draft we couldn't use. Please try again.",
        502,
        "unusable_output",
      ),
    );
  }
  return { message, source: "ai", model: config.model };
}
