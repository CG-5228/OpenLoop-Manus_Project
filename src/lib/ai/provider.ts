import { readBoundedText } from "./body";
import { ExtractionError, invalidOutput } from "./errors";
import { buildModelMessages, EXTRACTION_SCHEMA } from "./prompt";
import { isRecord, LIMITS, type ExtractionRequest } from "./request";

export interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

export function readProviderConfig(env: NodeJS.ProcessEnv = process.env): ProviderConfig {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new ExtractionError("AI_NOT_CONFIGURED", "AI analysis is not configured. Ask the deployment owner to set the server-side provider credential.", 503);
  const baseUrl = (env.OPENAI_BASE_URL ?? env.OPENAI_API_BASE ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("invalid provider URL");
  } catch {
    throw new ExtractionError("AI_NOT_CONFIGURED", "The server-side AI provider URL is invalid.", 503);
  }
  const model = env.OPENAI_MODEL?.trim() || "gpt-5-mini";
  return { apiKey, baseUrl, model, timeoutMs: 60_000 };
}

export async function callExtractionModel(
  request: ExtractionRequest,
  config: ProviderConfig = readProviderConfig(),
  transport: typeof fetch = fetch,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await transport(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model,
        messages: buildModelMessages(request),
        response_format: { type: "json_schema", json_schema: { name: "openloop_extraction", strict: true, schema: EXTRACTION_SCHEMA } },
        max_completion_tokens: 24_000,
        stream: false,
      }),
      signal: controller.signal,
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 401 || response.status === 403) throw new ExtractionError("AI_PROVIDER_AUTH", "AI provider access was denied. The deployment owner must check the server credential.", 503);
      if (response.status === 429) throw new ExtractionError("AI_RATE_LIMITED", "AI analysis is temporarily rate-limited. Please try again shortly.", 503);
      throw new ExtractionError("AI_PROVIDER_ERROR", "AI provider could not analyse the conversation. Please try again.", 502);
    }
    const text = await readBoundedText(response.body, LIMITS.providerResponseBytes, new ExtractionError("INVALID_MODEL_OUTPUT", "AI response exceeded the allowed size. Please split the conversation.", 502));
    let payload: unknown;
    try { payload = JSON.parse(text); } catch { invalidOutput(); }
    if (!isRecord(payload) || !Array.isArray(payload.choices) || !isRecord(payload.choices[0])) invalidOutput();
    const choice = payload.choices[0];
    if (choice.finish_reason !== "stop" || !isRecord(choice.message) || choice.message.refusal || typeof choice.message.content !== "string") invalidOutput();
    try { return JSON.parse(choice.message.content); } catch { invalidOutput(); }
  } catch (error) {
    if (error instanceof ExtractionError) throw error;
    if (controller.signal.aborted) throw new ExtractionError("AI_TIMEOUT", "AI analysis timed out. Please retry with a smaller conversation.", 504);
    throw new ExtractionError("AI_PROVIDER_ERROR", "AI provider is unavailable or returned an unreadable response. Please try again.", 502);
  } finally {
    clearTimeout(timer);
  }
}
