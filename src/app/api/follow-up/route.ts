/**
 * POST /api/follow-up — Module D (Commitment Management, Member 4)
 *
 * Team contract (README → "API contracts"):
 *   Body:    { commitment: Commitment, tone?: "casual" | "polite" | "firm" }
 *   200:     { message: string }
 *
 * Additive, optional fields (ignored by clients that don't need them):
 *   Body:    currentUserLabel?: string, now?: ISO string, allowTemplate?: boolean
 *   200:     source: "ai" | "template", model: string | null, notice?: string
 *
 * Errors: 400 invalid body · 413 too large · 503 AI not configured ·
 *         502 AI provider failed or returned unusable output — all as { error }.
 * No silent fixture fallback: a non-AI template is returned ONLY when the
 * client sends allowTemplate: true, and it is labelled source: "template".
 *
 * The draft is returned to the user for review; nothing is ever sent.
 * GET returns { aiConfigured, model } (no secrets) for health checks.
 */

import { connection, NextResponse } from "next/server";
import { validateFollowUpRequest } from "@/lib/commitments/followup";
import {
  FollowUpUnavailableError,
  generateFollowUp,
  getAiConfig,
} from "@/lib/commitments/followup.server";

const MAX_BODY_BYTES = 16 * 1024;
const NO_STORE = { "Cache-Control": "no-store" };

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE });
}

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return error("Request body too large", 413);

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return error("Request body too large", 413);
    body = JSON.parse(text);
  } catch {
    return error("Body must be valid JSON", 400);
  }

  const parsed = validateFollowUpRequest(body);
  if (!parsed.ok) return error(parsed.reason, 400);

  try {
    const result = await generateFollowUp(parsed.value, getAiConfig());
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof FollowUpUnavailableError) return error(err.message, err.status);
    console.error("[follow-up] unexpected error:", err);
    return error("Something went wrong while drafting the follow-up.", 500);
  }
}

export async function GET() {
  // Read env at request time, not at build/prerender time.
  await connection();
  const config = getAiConfig();
  return NextResponse.json(
    { aiConfigured: Boolean(config.apiKey), model: config.apiKey ? config.model : null },
    { headers: NO_STORE },
  );
}
