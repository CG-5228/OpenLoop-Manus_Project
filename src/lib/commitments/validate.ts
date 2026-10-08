/**
 * Runtime validation for the shared contracts. Used when reading from
 * localStorage, when accepting commitments from other modules, and by the
 * follow-up API route. Pure — safe on server and client.
 */

import type { Commitment, CompletionSuggestion, Message } from "./types";
import { normalizeDeadlineLenient } from "./dates";

const DIRECTIONS = ["you_owe", "they_owe", "unknown"] as const;
const CONFIDENCES = ["high", "medium", "low"] as const;
const STATUSES = ["pending", "completed", "dismissed"] as const;
const SOURCES = ["paste", "txt", "image"] as const;

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; reason: string };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function oneOf<T extends readonly string[]>(list: T, v: unknown): v is T[number] {
  return typeof v === "string" && (list as readonly string[]).includes(v);
}

/**
 * Validate and normalise an incoming Commitment. Trims strings, normalises
 * `dueAt` to ISO (unparseable → null; deadlines are never invented) and
 * rejects anything missing required evidence.
 */
export function validateCommitment(input: unknown): ValidationResult<Commitment> {
  if (!isObject(input)) return { ok: false, reason: "not an object" };
  const c = input;

  if (!nonEmptyString(c.id)) return { ok: false, reason: "missing id" };
  if (!nonEmptyString(c.title)) return { ok: false, reason: "missing title" };
  if (!nonEmptyString(c.promisor)) return { ok: false, reason: "missing promisor" };
  if (!(c.beneficiary === null || c.beneficiary === undefined || typeof c.beneficiary === "string"))
    return { ok: false, reason: "beneficiary must be string or null" };
  if (!oneOf(DIRECTIONS, c.direction)) return { ok: false, reason: "invalid direction" };
  if (!(c.dueAt === null || c.dueAt === undefined || typeof c.dueAt === "string"))
    return { ok: false, reason: "dueAt must be string or null" };
  if (!nonEmptyString(c.evidenceQuote)) return { ok: false, reason: "missing evidenceQuote" };
  if (!nonEmptyString(c.sourceMessageId)) return { ok: false, reason: "missing sourceMessageId" };
  if (!oneOf(CONFIDENCES, c.confidence)) return { ok: false, reason: "invalid confidence" };
  if (!oneOf(STATUSES, c.status)) return { ok: false, reason: "invalid status" };

  const beneficiary =
    typeof c.beneficiary === "string" && c.beneficiary.trim() ? c.beneficiary.trim() : null;

  return {
    ok: true,
    value: {
      id: c.id.trim(),
      title: c.title.trim(),
      promisor: c.promisor.trim(),
      beneficiary,
      direction: c.direction,
      dueAt: normalizeDeadlineLenient(c.dueAt),
      evidenceQuote: c.evidenceQuote.trim(),
      sourceMessageId: c.sourceMessageId.trim(),
      confidence: c.confidence,
      status: c.status,
    },
  };
}

export function isCommitment(input: unknown): input is Commitment {
  return validateCommitment(input).ok;
}

export function validateCompletionSuggestion(
  input: unknown,
): ValidationResult<CompletionSuggestion> {
  if (!isObject(input)) return { ok: false, reason: "not an object" };
  const s = input;
  if (!nonEmptyString(s.commitmentId)) return { ok: false, reason: "missing commitmentId" };
  if (!nonEmptyString(s.sourceMessageId)) return { ok: false, reason: "missing sourceMessageId" };
  if (!nonEmptyString(s.evidenceQuote)) return { ok: false, reason: "missing evidenceQuote" };
  if (!oneOf(CONFIDENCES, s.confidence)) return { ok: false, reason: "invalid confidence" };
  if (typeof s.reason !== "string") return { ok: false, reason: "missing reason" };
  return {
    ok: true,
    value: {
      commitmentId: s.commitmentId.trim(),
      sourceMessageId: s.sourceMessageId.trim(),
      evidenceQuote: s.evidenceQuote.trim(),
      confidence: s.confidence,
      reason: s.reason.trim(),
    },
  };
}

/** Validate a shared `Message` (kept only as evidence context for commitments). */
export function validateMessage(input: unknown): ValidationResult<Message> {
  if (!isObject(input)) return { ok: false, reason: "not an object" };
  const m = input;
  if (!nonEmptyString(m.id)) return { ok: false, reason: "missing id" };
  if (typeof m.conversationId !== "string") return { ok: false, reason: "missing conversationId" };
  if (typeof m.sender !== "string") return { ok: false, reason: "missing sender" };
  if (typeof m.text !== "string") return { ok: false, reason: "missing text" };
  if (!(m.sentAt === null || m.sentAt === undefined || typeof m.sentAt === "string"))
    return { ok: false, reason: "sentAt must be string or null" };
  if (!oneOf(SOURCES, m.source)) return { ok: false, reason: "invalid source" };
  return {
    ok: true,
    value: {
      id: m.id.trim(),
      conversationId: m.conversationId,
      sender: m.sender,
      text: m.text,
      sentAt: typeof m.sentAt === "string" && !Number.isNaN(Date.parse(m.sentAt)) ? m.sentAt : null,
      source: m.source,
    },
  };
}
