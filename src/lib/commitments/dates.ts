/**
 * Deadline utilities. Overdue is ALWAYS derived from `dueAt` — never stored.
 *
 * Accepted `dueAt` inputs (from extraction or the user):
 *   - Full ISO timestamps: "2026-10-09T17:00:00.000Z", "2026-10-09T17:00:00+01:00"
 *   - Date-only ISO:       "2026-10-09"   → treated as END of that local day
 *   - datetime-local:      "2026-10-09T17:00" → interpreted in local time
 * Everything is normalised to a full ISO string (toISOString) when stored.
 */

import type { Commitment } from "./types";

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

export class InvalidDeadlineError extends Error {
  constructor(input: unknown) {
    super(`Invalid deadline: ${JSON.stringify(input)}. Use an ISO date or null.`);
    this.name = "InvalidDeadlineError";
  }
}

/** Parse a stored/incoming deadline into a Date, or null if absent/invalid. */
export function parseDueDate(dueAt: string | null | undefined): Date | null {
  if (dueAt == null) return null;
  const value = String(dueAt).trim();
  if (!value) return null;

  const dateOnly = DATE_ONLY.exec(value);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    const date = new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999);
    // Reject impossible dates such as 2026-02-31 (JS would roll them over).
    if (date.getMonth() !== Number(m) - 1 || date.getDate() !== Number(d)) return null;
    return date;
  }

  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : new Date(ms);
}

/**
 * Normalise a deadline for storage. Returns a full ISO string or null.
 * Throws InvalidDeadlineError for non-empty values that cannot be parsed —
 * we never silently invent or drop a deadline the user typed.
 */
export function normalizeDeadlineInput(input: string | Date | null | undefined): string | null {
  if (input == null) return null;
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) throw new InvalidDeadlineError(input);
    return input.toISOString();
  }
  if (typeof input !== "string") throw new InvalidDeadlineError(input);
  if (!input.trim()) return null;
  const parsed = parseDueDate(input);
  if (!parsed) throw new InvalidDeadlineError(input);
  return parsed.toISOString();
}

/** Lenient variant for imported data: unparseable deadlines become null. */
export function normalizeDeadlineLenient(input: unknown): string | null {
  if (typeof input !== "string") return null;
  try {
    return normalizeDeadlineInput(input);
  } catch {
    return null;
  }
}

/** True when a PENDING commitment's deadline has passed. */
export function isOverdue(
  commitment: Pick<Commitment, "dueAt" | "status">,
  now: Date = new Date(),
): boolean {
  if (commitment.status !== "pending") return false;
  const due = parseDueDate(commitment.dueAt);
  return due !== null && due.getTime() < now.getTime();
}

export type DueState = "none" | "overdue" | "due_today" | "due_soon" | "upcoming";

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Whole local calendar days from `now` to `date` (negative = past). */
export function calendarDaysBetween(now: Date, date: Date): number {
  return Math.round((startOfLocalDay(date) - startOfLocalDay(now)) / MS_DAY);
}

/** Coarse urgency bucket for a deadline (status-agnostic). */
export function getDueState(dueAt: string | null, now: Date = new Date()): DueState {
  const due = parseDueDate(dueAt);
  if (!due) return "none";
  if (due.getTime() < now.getTime()) return "overdue";
  const days = calendarDaysBetween(now, due);
  if (days === 0) return "due_today";
  if (due.getTime() - now.getTime() <= 2 * MS_DAY) return "due_soon";
  return "upcoming";
}

function isEndOfDay(date: Date): boolean {
  return date.getHours() === 23 && date.getMinutes() === 59;
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

/** Absolute, human-friendly deadline, e.g. "Fri 9 Oct, 17:00" or "Fri 9 Oct". */
export function formatDeadline(
  dueAt: string | null,
  locale?: string,
): string | null {
  const due = parseDueDate(dueAt);
  if (!due) return null;
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
  };
  if (due.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
  const datePart = new Intl.DateTimeFormat(locale, opts).format(due);
  if (isEndOfDay(due)) return datePart;
  const timePart = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(due);
  return `${datePart}, ${timePart}`;
}

/**
 * Relative, human-friendly deadline label for cards:
 * "No deadline", "Overdue by 2 days", "Due today", "Due tomorrow",
 * "Due in 3 days", or an absolute date for anything further out.
 */
export function describeDeadline(
  dueAt: string | null,
  now: Date = new Date(),
  locale?: string,
): string {
  const due = parseDueDate(dueAt);
  if (!due) return "No deadline";

  const diff = due.getTime() - now.getTime();
  if (diff < 0) {
    const past = -diff;
    if (past < MS_HOUR) return "Overdue by less than an hour";
    if (past < MS_DAY) return `Overdue by ${plural(Math.floor(past / MS_HOUR), "hour")}`;
    return `Overdue by ${plural(Math.max(1, -calendarDaysBetween(now, due)), "day")}`;
  }

  const days = calendarDaysBetween(now, due);
  const time = isEndOfDay(due)
    ? ""
    : `, ${new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(due)}`;
  if (days === 0) return `Due today${time}`;
  if (days === 1) return `Due tomorrow${time}`;
  if (days < 7) return `Due in ${days} days`;
  return `Due ${formatDeadline(dueAt, locale)}`;
}

/**
 * Status-aware label for a commitment card. Completed/dismissed items never
 * read as "Overdue" — they show the absolute deadline instead.
 */
export function describeCommitmentDeadline(
  commitment: Pick<Commitment, "dueAt" | "status">,
  now: Date = new Date(),
  locale?: string,
): string {
  if (commitment.status === "pending") return describeDeadline(commitment.dueAt, now, locale);
  const formatted = formatDeadline(commitment.dueAt, locale);
  return formatted ? `Due ${formatted}` : "No deadline";
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Value for <input type="datetime-local"> from a stored ISO deadline. */
export function toDateTimeLocalValue(dueAt: string | null): string {
  const due = parseDueDate(dueAt);
  if (!due) return "";
  return `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}T${pad(
    due.getHours(),
  )}:${pad(due.getMinutes())}`;
}

/** Value for <input type="date"> from a stored ISO deadline. */
export function toDateInputValue(dueAt: string | null): string {
  const due = parseDueDate(dueAt);
  if (!due) return "";
  return `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}`;
}
