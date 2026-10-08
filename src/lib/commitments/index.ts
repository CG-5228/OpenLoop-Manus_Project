/**
 * Module D — Commitment Management (public API).
 *
 * Framework-free exports (safe in server and client code). React hooks live
 * in "@/hooks/useCommitments" (client components only):
 *
 *   import { commitmentStore, describeDeadline } from "@/lib/commitments";
 *   import { useCommitments, useCommitment, useFollowUp } from "@/hooks/useCommitments";
 *
 * Server-only follow-up generation is in "./followup.server" (used by
 * src/app/api/follow-up/route.ts); never import it from client code.
 *
 * See docs/modules/commitments.md for the full integration guide.
 */

export * from "./types";
export {
  commitmentStore,
  createCommitmentStore,
  getBrowserStorage,
  STORAGE_KEY,
  CommitmentNotFoundError,
  StorageWriteError,
  ValidationError,
  type CommitmentStore,
  type CommitmentStoreOptions,
  type StorageLike,
} from "./store";
export {
  parseDueDate,
  normalizeDeadlineInput,
  isOverdue,
  getDueState,
  describeDeadline,
  describeCommitmentDeadline,
  formatDeadline,
  toDateTimeLocalValue,
  toDateInputValue,
  InvalidDeadlineError,
  type DueState,
} from "./dates";
export {
  getDisplayStatus,
  computeStats,
  filterCommitments,
  sortByUrgency,
  counterpartyOf,
  hasOpenSuggestion,
  STATUS_LABELS,
  DIRECTION_LABELS,
  CONFIDENCE_LABELS,
} from "./status";
export {
  validateCommitment,
  validateCompletionSuggestion,
  validateMessage,
  isCommitment,
} from "./validate";
export { normalizeText, evidenceFingerprint } from "./dedupe";
export { templateFollowUp, FOLLOW_UP_TONES } from "./followup";
export {
  requestFollowUp,
  copyToClipboard,
  FollowUpRequestError,
  FOLLOW_UP_ENDPOINT,
} from "./followup-client";
