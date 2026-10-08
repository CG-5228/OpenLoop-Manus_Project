/**
 * Derived status, dashboard statistics, filtering, search and sorting.
 * Pure functions — the dashboard (Module A) can use these directly or via
 * the hooks in ./hooks.ts.
 */

import type {
  Commitment,
  CommitmentFilter,
  CommitmentStats,
  CompletionSuggestion,
  DisplayStatus,
} from "./types";
import { isOverdue, parseDueDate } from "./dates";
import { normalizeText } from "./dedupe";

export const STATUS_LABELS: Record<DisplayStatus, string> = {
  pending: "Pending",
  overdue: "Overdue",
  needs_review: "Needs Review",
  completed: "Completed",
  dismissed: "Dismissed",
};

export const DIRECTION_LABELS: Record<Commitment["direction"], string> = {
  you_owe: "You Owe",
  they_owe: "They Owe You",
  unknown: "Unclear",
};

export const CONFIDENCE_LABELS: Record<Commitment["confidence"], string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

export interface DisplayStatusContext {
  now?: Date;
  /** Open completion suggestions (all, or just this commitment's). */
  suggestions?: readonly CompletionSuggestion[];
}

export function hasOpenSuggestion(
  commitmentId: string,
  suggestions: readonly CompletionSuggestion[] = [],
): boolean {
  return suggestions.some((s) => s.commitmentId === commitmentId);
}

/**
 * UI status for a commitment. Precedence for pending items:
 *   needs_review (open completion suggestion, low confidence or unknown direction)
 *   → overdue → pending.
 */
export function getDisplayStatus(c: Commitment, ctx: DisplayStatusContext = {}): DisplayStatus {
  if (c.status === "completed") return "completed";
  if (c.status === "dismissed") return "dismissed";
  if (
    hasOpenSuggestion(c.id, ctx.suggestions) ||
    c.confidence === "low" ||
    c.direction === "unknown"
  )
    return "needs_review";
  if (isOverdue(c, ctx.now ?? new Date())) return "overdue";
  return "pending";
}

export function computeStats(
  commitments: readonly Commitment[],
  ctx: DisplayStatusContext = {},
): CommitmentStats {
  const now = ctx.now ?? new Date();
  const stats: CommitmentStats = {
    open: 0,
    youOwe: 0,
    theyOwe: 0,
    unknownDirection: 0,
    overdue: 0,
    needsReview: 0,
    completed: 0,
    dismissed: 0,
  };
  for (const c of commitments) {
    if (c.status === "completed") {
      stats.completed++;
      continue;
    }
    if (c.status === "dismissed") {
      stats.dismissed++;
      continue;
    }
    stats.open++;
    if (c.direction === "you_owe") stats.youOwe++;
    else if (c.direction === "they_owe") stats.theyOwe++;
    else stats.unknownDirection++;
    // Overdue is counted independently of needs_review so the stat card
    // reflects every pending item whose deadline has passed.
    if (isOverdue(c, now)) stats.overdue++;
    if (getDisplayStatus(c, { now, suggestions: ctx.suggestions }) === "needs_review")
      stats.needsReview++;
  }
  return stats;
}

function matchesQuery(c: Commitment, query: string): boolean {
  const q = normalizeText(query);
  if (!q) return true;
  const haystack = normalizeText(
    [c.title, c.promisor, c.beneficiary ?? "", c.evidenceQuote].join(" "),
  );
  return q.split(" ").every((term) => haystack.includes(term));
}

/**
 * Filter by direction, status and free-text search (title, people, evidence).
 *   status "open"    → all pending (incl. overdue / needs review)
 *   status "overdue" → pending with a passed deadline (even if also needs review)
 *   other statuses   → exact display-status match
 */
export function filterCommitments(
  commitments: readonly Commitment[],
  filter: CommitmentFilter = {},
  ctx: DisplayStatusContext = {},
): Commitment[] {
  const now = ctx.now ?? new Date();
  const { direction = "all", status = "all", query = "" } = filter;
  return commitments.filter((c) => {
    if (direction !== "all" && c.direction !== direction) return false;
    if (status !== "all") {
      if (status === "open") {
        if (c.status !== "pending") return false;
      } else if (status === "overdue") {
        if (!isOverdue(c, now)) return false;
      } else if (getDisplayStatus(c, { now, suggestions: ctx.suggestions }) !== status) {
        return false;
      }
    }
    return matchesQuery(c, query);
  });
}

const STATUS_RANK: Record<Commitment["status"], number> = {
  pending: 0,
  completed: 1,
  dismissed: 2,
};

/**
 * Urgency order: pending before completed/dismissed; within pending, overdue
 * first (most overdue first), then soonest deadline, then no deadline.
 * Stable for ties.
 */
export function sortByUrgency(commitments: readonly Commitment[]): Commitment[] {
  return commitments
    .map((c, i) => ({ c, i, due: parseDueDate(c.dueAt)?.getTime() ?? Infinity }))
    .sort(
      (a, b) =>
        STATUS_RANK[a.c.status] - STATUS_RANK[b.c.status] || a.due - b.due || a.i - b.i,
    )
    .map((x) => x.c);
}

/** The person a follow-up should be addressed to. */
export function counterpartyOf(c: Commitment, currentUserLabel?: string): string | null {
  if (c.direction === "they_owe") return c.promisor;
  if (c.direction === "you_owe") return c.beneficiary;
  const me = normalizeText(currentUserLabel);
  if (me && normalizeText(c.promisor) === me) return c.beneficiary;
  return c.promisor;
}
