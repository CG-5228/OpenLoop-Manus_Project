"use client";

/**
 * `@/hooks/useCommitments` — Member 4 (Commitment Management) public hook entry.
 *
 * Team contract (PROJECT_BRIEF §8 / README): `useCommitments()` exposes
 * `commitments`, `addCommitments`, `updateCommitment` and `dismissCommitment`.
 *
 *   import { useCommitments } from "@/hooks/useCommitments";
 *
 *   const { commitments, addCommitments, updateCommitment, dismissCommitment, state, error } =
 *     useCommitments();
 *
 *   addCommitments(extracted, importedMessages);      // duplicates skipped; cited messages kept
 *   updateCommitment(id, { status: "completed" });    // complete
 *   updateCommitment(id, { status: "pending" });      // undo complete / undo dismiss
 *   updateCommitment(id, { dueAt: "2026-10-09" });    // edit deadline (null clears it)
 *   dismissCommitment(id);                            // "not a commitment"
 *
 * Implementation lives in `src/lib/commitments/` (see docs/modules/commitments.md).
 */

export {
  useCommitments,
  useCommitment,
  useFollowUp,
  useCommitmentsError,
  useHydrated,
  useNow,
  commitmentActions,
  commitmentContract,
  type UseCommitmentsResult,
  type UseCommitmentsOptions,
  type UseFollowUpOptions,
  type FollowUpStatus,
} from "@/lib/commitments/hooks";
