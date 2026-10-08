/**
 * Follow-up message generation — shared, framework-free logic used by
 * POST /api/follow-up (server) and tests.
 *
 * Rules (BRIEF §12): follow-ups are DRAFTS. They are never sent
 * automatically; the user reviews, edits and copies them. Messages must
 * reflect the original conversation and must not invent facts.
 */

import type { Commitment, FollowUpRequest, FollowUpTone } from "./types";
import { formatDeadline, isOverdue, parseDueDate } from "./dates";
import { counterpartyOf } from "./status";
import { validateCommitment, type ValidationResult } from "./validate";

export const FOLLOW_UP_TONES: readonly FollowUpTone[] = ["casual", "polite", "firm"];
/** Lenient aliases so older/other clients don't get a 400 for a near-miss tone. */
const TONE_ALIASES: Record<string, FollowUpTone> = { friendly: "casual", neutral: "polite" };
export const MAX_FOLLOW_UP_CHARS = 600;
const MAX_QUOTE_CHARS = 2000;

/** Validate the POST body for /api/follow-up. */
export function validateFollowUpRequest(body: unknown): ValidationResult<Required<
  Pick<FollowUpRequest, "commitment" | "tone" | "allowTemplate">
> & { currentUserLabel: string | null; now: Date }> {
  if (!body || typeof body !== "object") return { ok: false, reason: "Body must be a JSON object" };
  const b = body as Record<string, unknown>;

  const c = validateCommitment(b.commitment);
  if (!c.ok) return { ok: false, reason: `Invalid commitment: ${c.reason}` };
  if (c.value.evidenceQuote.length > MAX_QUOTE_CHARS)
    return { ok: false, reason: "evidenceQuote is too long" };

  let tone: FollowUpTone = "casual";
  if (b.tone !== undefined && b.tone !== null) {
    const t = typeof b.tone === "string" ? (TONE_ALIASES[b.tone] ?? b.tone) : b.tone;
    if (!FOLLOW_UP_TONES.includes(t as FollowUpTone))
      return { ok: false, reason: `tone must be one of ${FOLLOW_UP_TONES.join(", ")}` };
    tone = t as FollowUpTone;
  }

  if (b.allowTemplate !== undefined && typeof b.allowTemplate !== "boolean")
    return { ok: false, reason: "allowTemplate must be a boolean" };
  const allowTemplate = b.allowTemplate === true;

  let currentUserLabel: string | null = null;
  if (b.currentUserLabel !== undefined && b.currentUserLabel !== null) {
    if (typeof b.currentUserLabel !== "string" || b.currentUserLabel.length > 100)
      return { ok: false, reason: "currentUserLabel must be a short string" };
    currentUserLabel = b.currentUserLabel.trim() || null;
  }

  let now = new Date();
  if (b.now !== undefined) {
    const ms = typeof b.now === "string" ? Date.parse(b.now) : NaN;
    if (Number.isNaN(ms)) return { ok: false, reason: "now must be an ISO date string" };
    now = new Date(ms);
  }

  return { ok: true, value: { commitment: c.value, tone, currentUserLabel, now, allowTemplate } };
}

function firstName(name: string | null | undefined): string | null {
  if (!name) return null;
  const n = name.trim().split(/\s+/)[0];
  return n || null;
}

function truncate(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

/** Facts given to the model — only data already present in the commitment. */
export function buildFollowUpFacts(
  commitment: Commitment,
  opts: { currentUserLabel?: string | null; now?: Date; tone?: FollowUpTone } = {},
) {
  const now = opts.now ?? new Date();
  const recipient = counterpartyOf(commitment, opts.currentUserLabel ?? undefined);
  const due = parseDueDate(commitment.dueAt);
  return {
    perspective:
      commitment.direction === "you_owe"
        ? "The user made this promise and is writing to the person they promised."
        : commitment.direction === "they_owe"
          ? "Someone promised this to the user; the user is nudging them."
          : "The direction is unclear; write a neutral check-in.",
    direction: commitment.direction,
    recipientName: recipient,
    userName: opts.currentUserLabel ?? null,
    commitmentTitle: commitment.title,
    promisor: commitment.promisor,
    beneficiary: commitment.beneficiary,
    originalMessage: commitment.evidenceQuote,
    deadline: due ? formatDeadline(commitment.dueAt, "en-GB") : null,
    deadlineIso: due ? due.toISOString() : null,
    isOverdue: isOverdue(commitment, now),
    currentTimeIso: now.toISOString(),
    tone: opts.tone ?? "casual",
  };
}

export const FOLLOW_UP_SYSTEM_PROMPT = `You draft short follow-up messages for OpenLoop, an app that tracks promises made in chats.

Write ONE chat message the user can copy and send. Rules:
- 1 to 3 short sentences, under 60 words, plain text, no subject line, no sign-off name, no emojis unless the tone is casual (max one).
- Start with a short greeting and the recipient's first name, e.g. "Hey Alex," (casual) or "Hi Alex," (polite/firm). If recipientName is null use "Hi there,".
- Refer to the specific item from originalMessage / commitmentTitle so the recipient knows exactly what this is about.
- Use ONLY facts provided. Never invent amounts, dates, files, reasons, excuses, urgency or new deadlines, and never add claims about the user's situation (e.g. "I'm blocked", "I'm waiting to proceed").
- Only say the person "said" or "promised" what appears in originalMessage. When mentioning the deadline field, phrase it as the due date (e.g. "it was due Tuesday"), never as words they said, because the user may have edited it.
- If isOverdue is true, acknowledge the timing lightly (no guilt-tripping). If not overdue, don't imply lateness.
- direction "they_owe": a polite nudge asking about the item.
- direction "you_owe": a brief update from the user to the recipient acknowledging the item (e.g. still on it / apologise for the delay if overdue). Do NOT claim it is done and do NOT promise a new date.
- direction "unknown": a neutral check-in.
- Tone: casual = warm and relaxed; polite = courteous and concise; firm = direct and clear but still courteous. Firm changes WORDING only (a clear, direct ask, e.g. "Could you send it today?" only if a deadline is given, otherwise "Could you send it over?"); it never adds reasons, needs, consequences or what the user will do with the item (no "I need it to…", "so I can…", "to move forward").
- Never use placeholders like [Name] or <date>.

Example (they_owe, casual, not overdue, originalMessage "I'll send you the API key."):
{"message": "Hey Alex, just checking in on that API key whenever you get a chance. Thanks!"}

Example (they_owe, firm, no deadline, originalMessage "I'll send you the API key."):
{"message": "Hi Alex, following up on the API key you said you'd send. Could you send it over? Thanks."}

Respond with JSON: {"message": "..."}`;

/** JSON schema for structured output (OpenAI-compatible, strict). */
export const FOLLOW_UP_RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "follow_up",
    strict: true,
    schema: {
      type: "object",
      properties: { message: { type: "string" } },
      required: ["message"],
      additionalProperties: false,
    },
  },
} as const;

/**
 * Clean and validate model output. Returns null if unusable (empty, too
 * long, or containing template placeholders) so the caller can report it.
 */
export function sanitizeFollowUp(raw: unknown): string | null {
  let text: string | null = null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed) as { message?: unknown };
        text = typeof parsed.message === "string" ? parsed.message : null;
      } catch {
        text = trimmed;
      }
    } else {
      text = trimmed;
    }
  } else if (raw && typeof raw === "object" && typeof (raw as { message?: unknown }).message === "string") {
    text = (raw as { message: string }).message;
  }
  if (!text) return null;

  text = text
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!text) return null;
  if (text.length > MAX_FOLLOW_UP_CHARS) return null;
  if (/\[[^\]]*\]|<[^>]+>|\{\{[^}]*\}\}/.test(text)) return null; // placeholders
  return text;
}

/**
 * Deterministic, non-AI draft. Always quotes the original message rather
 * than paraphrasing it, so it cannot misrepresent the conversation.
 * Only returned when the client opts in (`allowTemplate`), and callers MUST
 * label it as a template (source: "template") — never present it as AI.
 */
export function templateFollowUp(
  commitment: Commitment,
  opts: { currentUserLabel?: string | null; now?: Date; tone?: FollowUpTone } = {},
): string {
  const now = opts.now ?? new Date();
  const tone = opts.tone ?? "casual";
  const name = firstName(counterpartyOf(commitment, opts.currentUserLabel ?? undefined));
  const greeting = tone === "casual" ? (name ? `Hey ${name}` : "Hey") : name ? `Hi ${name}` : "Hi";
  const bare = truncate(commitment.evidenceQuote, 140).replace(/^["“]+|["”]+$/g, "");
  const quote = /[.!?…]$/.test(bare) ? `"${bare}"` : `"${bare}".`;
  const overdue = isOverdue(commitment, now);
  const thanks = tone === "firm" ? "Thanks." : "Thanks!";

  if (commitment.direction === "you_owe") {
    return overdue
      ? `${greeting}, quick note about this: ${quote} Sorry it's taken longer than planned — I haven't forgotten.`
      : `${greeting}, just a quick note to say I haven't forgotten about this: ${quote}`;
  }

  if (tone === "firm") {
    return overdue
      ? `${greeting}, following up on this: ${quote} It looks like this is now overdue — could you let me know when I can expect it? ${thanks}`
      : `${greeting}, following up on this: ${quote} Could you let me know where it's at? ${thanks}`;
  }
  return overdue
    ? `${greeting}, just checking in on this: ${quote} Any update when you get a chance? ${thanks}`
    : `${greeting}, just following up on this: ${quote} Let me know whenever you get a chance. ${thanks}`;
}
