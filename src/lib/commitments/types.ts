/**
 * Module D — Commitment Management: type surface.
 *
 * Shared contracts come exclusively from `src/types/openloop.ts` (Member 5's
 * foundation). Everything below is module-private bookkeeping layered around
 * them — the shared shapes are never extended.
 */

export type {
  Message,
  Commitment,
  CompletionSuggestion,
  CommitmentStatus,
  Confidence,
  Direction,
  Source,
} from "../../types/openloop";

import type {
  Commitment,
  CommitmentStatus,
  CompletionSuggestion,
  Confidence,
  Direction,
  Message,
} from "../../types/openloop";

/** Alias kept for readability inside this module. */
export type CommitmentDirection = Direction;

/**
 * UI-facing status. "overdue" and "needs_review" are DERIVED, never stored:
 *  - overdue: pending and the deadline has passed.
 *  - needs_review: pending and low-confidence, unknown direction, or has an
 *    open completion suggestion awaiting the user's confirmation.
 */
export type DisplayStatus =
  | "pending"
  | "overdue"
  | "needs_review"
  | "completed"
  | "dismissed";

/** Evidence recorded when the user confirms a completion suggestion. */
export interface CompletionEvidence {
  sourceMessageId: string;
  evidenceQuote: string;
  confidence: Confidence;
  reason: string;
  confirmedAt: string;
}

/**
 * Storage record. The Commitment itself is kept exactly in the shared shape;
 * module-private bookkeeping lives alongside it rather than being added to
 * the shared type.
 */
export interface CommitmentRecord {
  commitment: Commitment;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  dismissedAt: string | null;
  /** True once the user has edited the deadline; re-imports won't overwrite it. */
  deadlineEditedByUser: boolean;
  /** Present when completed via a confirmed completion suggestion. */
  completion: CompletionEvidence | null;
}

export interface CommitmentsSnapshot {
  /** Commitments in the shared shape, newest import first. */
  commitments: readonly Commitment[];
  records: readonly CommitmentRecord[];
  /** Open completion suggestions awaiting user confirmation. */
  suggestions: readonly CompletionSuggestion[];
  /** Source messages cited by stored commitments/suggestions (evidence display). */
  messages: readonly Message[];
}

export interface SaveCommitmentsResult {
  /** Newly stored commitments (ids may have been re-assigned on collision). */
  added: Commitment[];
  /** Existing commitments that were enriched by the import (e.g. deadline filled). */
  updated: Commitment[];
  /** Incoming commitments skipped because they duplicate a stored one. */
  duplicates: Commitment[];
  /** Incoming items that failed validation, with a reason. */
  rejected: { input: unknown; reason: string }[];
}

export interface SaveSuggestionsResult {
  added: CompletionSuggestion[];
  /** Ignored: unknown commitment, not pending, duplicate, or previously rejected. */
  ignored: CompletionSuggestion[];
}

export interface CommitmentStats {
  /** Pending commitments (including overdue). "Total Open Loops". */
  open: number;
  youOwe: number;
  theyOwe: number;
  unknownDirection: number;
  overdue: number;
  needsReview: number;
  completed: number;
  dismissed: number;
}

export type DirectionFilter = "all" | CommitmentDirection;
export type StatusFilter = "all" | "open" | DisplayStatus;

export interface CommitmentFilter {
  direction?: DirectionFilter;
  status?: StatusFilter;
  query?: string;
}

/**
 * Fields the user may edit on a stored commitment. `status` routes through the
 * same transitions as markCompleted / restore / dismiss (timestamps and
 * suggestion clean-up), applied atomically with any other field edits.
 */
export type CommitmentPatch = Partial<
  Pick<Commitment, "title" | "beneficiary" | "direction" | "dueAt">
> & { status?: CommitmentStatus };

// ---------------------------------------------------------------------------
// Follow-up generation contract
//   POST /api/follow-up   (README → "API contracts")
// ---------------------------------------------------------------------------

/** README contract: "casual" | "polite"; "firm" is also accepted (dashboard option). */
export type FollowUpTone = "casual" | "polite" | "firm";

export interface FollowUpRequest {
  commitment: Commitment;
  /** The user's sender name in the conversation (e.g. "Me" or "Sam"). */
  currentUserLabel?: string;
  tone?: FollowUpTone;
  /** Client "now" (ISO) so overdue wording matches what the user sees. */
  now?: string;
  /**
   * Opt-in: when AI is unavailable, return a clearly-labelled non-AI template
   * (`source: "template"`) instead of an error. Only for UIs that display the
   * label. Default false → AI failures are returned as 502/503 errors.
   */
  allowTemplate?: boolean;
}

export interface FollowUpResponse {
  /** Draft message. Never sent automatically — the user reviews and copies it. */
  message: string;
  /** "ai" = model-generated; "template" = labelled non-AI draft (allowTemplate only). */
  source: "ai" | "template";
  model: string | null;
  /** Human-readable explanation when source is "template". */
  notice?: string;
}

export interface FollowUpErrorResponse {
  error: string;
}
