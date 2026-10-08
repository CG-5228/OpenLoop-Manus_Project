/**
 * Presentation helpers for commitments (Member 1 — Dashboard & UI).
 *
 * These functions are pure and derive *display* state from the shared
 * Commitment contract. They do not persist anything.
 *
 * INTEGRATION NOTE: `isOverdue` mirrors the rule in the brief ("Overdue is
 * calculated from the deadline"). If Member 4 (Commitment Management) exports
 * its own overdue helper, swap the implementation here so both stay in sync.
 */
import {
  differenceInCalendarDays,
  differenceInMinutes,
  format,
  isThisYear,
  isToday,
  isTomorrow,
  isYesterday,
} from "date-fns";
import type { Commitment, CompletionSuggestion, Confidence } from "@/types/openloop";

// ── Display status ─────────────────────────────────────────────────────────

export type DisplayStatus =
  | "pending"
  | "overdue"
  | "needs_review"
  | "completed"
  | "dismissed";

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  pending: "Pending",
  overdue: "Overdue",
  needs_review: "Needs review",
  completed: "Completed",
  dismissed: "Dismissed",
};

export function isOpen(c: Commitment) {
  return c.status === "pending";
}

// ── Deadline parsing ───────────────────────────────────────────────────────

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for date-only deadlines such as "2026-10-08" (Member 3 returns these when no time is stated). */
export function isDateOnly(iso: string) {
  return DATE_ONLY.test(iso);
}

/** Id prefix used by the simulated "Connect your apps" preview for its fictional commitments. */
export const PREVIEW_ID_PREFIX = "preview-";

/** True for fictional commitments added by the simulated app-connection preview, not real imports. */
export function isPreviewCommitment(c: Pick<Commitment, "id">) {
  return c.id.startsWith(PREVIEW_ID_PREFIX);
}

/**
 * Parses a deadline for display. A date-only value is a calendar date in the
 * user's local time zone. `new Date("2026-10-08")` would read it as UTC midnight,
 * which shows the wrong time and can shift it to the previous day west of UTC.
 */
export function parseDue(iso: string): Date {
  const m = DATE_ONLY.exec(iso);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(iso);
}

/** The moment a deadline is missed: the end of the local day for date-only deadlines. */
export function dueInstant(iso: string): number {
  const d = parseDue(iso);
  if (!isDateOnly(iso)) return d.getTime();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - 1;
}

export function isOverdue(c: Commitment, now: Date) {
  if (c.status !== "pending" || !c.dueAt) return false;
  return dueInstant(c.dueAt) < now.getTime();
}

/** Reasons a pending commitment needs the user's attention. */
export function getReviewReasons(
  c: Commitment,
  suggestion?: CompletionSuggestion,
): string[] {
  if (c.status !== "pending") return [];
  const reasons: string[] = [];
  if (suggestion) reasons.push("May already be complete");
  if (c.confidence === "low") reasons.push("Low AI confidence");
  if (c.direction === "unknown") reasons.push("Unclear who owes whom");
  return reasons;
}

export function getDisplayStatus(
  c: Commitment,
  now: Date,
  suggestion?: CompletionSuggestion,
): DisplayStatus {
  if (c.status === "completed") return "completed";
  if (c.status === "dismissed") return "dismissed";
  if (suggestion) return "needs_review";
  if (isOverdue(c, now)) return "overdue";
  if (c.confidence === "low" || c.direction === "unknown") return "needs_review";
  return "pending";
}

// ── People ─────────────────────────────────────────────────────────────────

/** The other party of a commitment, from the current user's point of view. */
export function getCounterparty(c: Commitment): string {
  if (c.direction === "you_owe") return c.beneficiary ?? "Someone";
  return c.promisor;
}

export function getDirectionLabel(c: Commitment): string {
  if (c.direction === "you_owe") return "You owe";
  if (c.direction === "they_owe") return "Owes you";
  return "Unclear";
}

/** "You → Sarah", "James → You", "Tom → Unknown" */
export function getFlowLabel(c: Commitment) {
  const from = c.direction === "you_owe" ? "You" : c.promisor;
  const to =
    c.direction === "they_owe" ? "You" : (c.beneficiary ?? "Not specified");
  return { from, to };
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_TONES = [
  "bg-[#E9E3FF] text-[#4B3A9E]",
  "bg-[#DFF1FF] text-[#1D5A8C]",
  "bg-[#FFE6D9] text-[#9A3F12]",
  "bg-[#DDF5E6] text-[#1F6B42]",
  "bg-[#FFE3EC] text-[#9C2453]",
  "bg-[#F4EBC9] text-[#6E5410]",
];

export function avatarTone(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}

// ── Deadlines ──────────────────────────────────────────────────────────────

export interface DueInfo {
  /** Short label for cards, e.g. "Today, 22:00" or "No deadline". */
  label: string;
  /** Relative hint, e.g. "in 3 days" or "2 days overdue". */
  relative: string | null;
  tone: "none" | "overdue" | "soon" | "later" | "done";
}

function hasTime(d: Date) {
  // Midnight and 23:59 (Module D's end-of-day form for date-only deadlines) mean "no time given".
  if (d.getHours() === 0 && d.getMinutes() === 0) return false;
  return !(d.getHours() === 23 && d.getMinutes() === 59);
}

export function formatDue(c: Commitment, now: Date): DueInfo {
  if (!c.dueAt) return { label: "No deadline", relative: null, tone: "none" };
  const d = parseDue(c.dueAt);
  if (Number.isNaN(d.getTime()))
    return { label: "Invalid date", relative: null, tone: "none" };
  const dateOnly = isDateOnly(c.dueAt);
  const due = dueInstant(c.dueAt);

  const time = !dateOnly && hasTime(d) ? `, ${format(d, "HH:mm")}` : "";
  let label: string;
  if (isToday(d)) label = `Today${time}`;
  else if (isTomorrow(d)) label = `Tomorrow${time}`;
  else if (isYesterday(d)) label = `Yesterday${time}`;
  else label = format(d, isThisYear(d) ? "EEE d MMM" : "d MMM yyyy");

  if (c.status !== "pending") return { label, relative: null, tone: "done" };

  const days = differenceInCalendarDays(d, now);
  if (due < now.getTime()) {
    const mins = differenceInMinutes(now, due);
    const relative =
      days === 0
        ? mins < 60
          ? `${Math.max(mins, 1)} min overdue`
          : `${Math.floor(mins / 60)} h overdue`
        : `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
    return { label, relative, tone: "overdue" };
  }
  if (days <= 1) {
    const mins = differenceInMinutes(due, now);
    const relative =
      days === 0 && !dateOnly
        ? mins < 60
          ? `in ${Math.max(mins, 1)} min`
          : `in ${Math.floor(mins / 60)} h`
        : null; // label already says "Today" (date-only) or "Tomorrow"
    return { label, relative, tone: "soon" };
  }
  return { label, relative: `in ${days} days`, tone: "later" };
}

export function formatFullDate(iso: string | null) {
  if (!iso) return null;
  const d = parseDue(iso);
  if (Number.isNaN(d.getTime())) return null;
  return format(d, !isDateOnly(iso) && hasTime(d) ? "EEEE d MMMM yyyy, HH:mm" : "EEEE d MMMM yyyy");
}

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

// ── Filtering, search, sorting ────────────────────────────────────────────

export type ViewKey = "overview" | "you-owe" | "they-owe" | "all";
export type StatusFilter =
  | "open"
  | "pending"
  | "overdue"
  | "needs_review"
  | "completed"
  | "dismissed"
  | "all";
export type SortKey = "due" | "person" | "confidence";

export const VIEW_KEYS: ViewKey[] = ["overview", "you-owe", "they-owe", "all"];
export const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "open", label: "All open" },
  { key: "pending", label: "Pending" },
  { key: "overdue", label: "Overdue" },
  { key: "needs_review", label: "Needs review" },
  { key: "completed", label: "Completed" },
  { key: "dismissed", label: "Dismissed" },
  { key: "all", label: "Everything" },
];
export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "due", label: "Deadline" },
  { key: "person", label: "Person" },
  { key: "confidence", label: "Confidence" },
];

export function parseView(v: string | null): ViewKey {
  return VIEW_KEYS.includes(v as ViewKey) ? (v as ViewKey) : "overview";
}
export function parseStatus(v: string | null): StatusFilter {
  return STATUS_FILTERS.some((s) => s.key === v) ? (v as StatusFilter) : "open";
}
export function parseSort(v: string | null): SortKey {
  return SORT_OPTIONS.some((s) => s.key === v) ? (v as SortKey) : "due";
}

export type SuggestionMap = Map<string, CompletionSuggestion>;

export function toSuggestionMap(list: CompletionSuggestion[]): SuggestionMap {
  return new Map(list.map((s) => [s.commitmentId, s]));
}

export function matchesStatus(
  c: Commitment,
  filter: StatusFilter,
  now: Date,
  suggestions: SuggestionMap,
) {
  const display = getDisplayStatus(c, now, suggestions.get(c.id));
  switch (filter) {
    case "all":
      return true;
    case "open":
      return c.status === "pending";
    case "overdue":
      return isOverdue(c, now);
    case "pending":
      return display === "pending";
    default:
      return display === filter;
  }
}

export function matchesView(c: Commitment, view: ViewKey) {
  if (view === "you-owe") return c.direction === "you_owe";
  if (view === "they-owe") return c.direction === "they_owe";
  return true;
}

export function matchesQuery(c: Commitment, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [c.title, c.promisor, c.beneficiary ?? "", c.evidenceQuote]
    .join(" \u0000 ")
    .toLowerCase()
    .includes(q);
}

const CONFIDENCE_RANK: Record<Confidence, number> = { high: 0, medium: 1, low: 2 };
const STATUS_RANK: Record<Commitment["status"], number> = {
  pending: 0,
  completed: 1,
  dismissed: 2,
};

export function sortCommitments(list: Commitment[], sort: SortKey) {
  return [...list].sort((a, b) => {
    const s = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (s !== 0) return s;
    if (sort === "person")
      return getCounterparty(a).localeCompare(getCounterparty(b));
    if (sort === "confidence") {
      const c = CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence];
      if (c !== 0) return c;
    }
    // Deadline: soonest first, undated last.
    if (!a.dueAt && !b.dueAt) return a.title.localeCompare(b.title);
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return dueInstant(a.dueAt) - dueInstant(b.dueAt);
  });
}

// ── Stats ──────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalOpen: number;
  youOwe: number;
  theyOwe: number;
  overdue: number;
  needsReview: number;
}

export function computeStats(
  list: Commitment[],
  now: Date,
  suggestions: SuggestionMap,
): DashboardStats {
  const open = list.filter(isOpen);
  return {
    totalOpen: open.length,
    youOwe: open.filter((c) => c.direction === "you_owe").length,
    theyOwe: open.filter((c) => c.direction === "they_owe").length,
    overdue: open.filter((c) => isOverdue(c, now)).length,
    needsReview: open.filter(
      (c) => getDisplayStatus(c, now, suggestions.get(c.id)) === "needs_review",
    ).length,
  };
}
