/**
 * The data interface the dashboard UI consumes (Member 1 ⇄ Members 4/5 seam).
 *
 * Every UI component reads commitments and triggers actions exclusively
 * through `useDashboardData()`, which returns this shape. To go live, implement
 * it inside `DashboardDataProvider` on top of:
 *
 *   Member 4 — `useCommitments()` from `@/hooks/useCommitments`
 *     commitments            → commitments
 *     addCommitments(list)   → addCommitments
 *     updateCommitment(id,…) → markCompleted / restore / updateDeadline
 *     dismissCommitment(id)  → dismiss
 *   Member 4 — `POST /api/follow-up` → generateFollowUp (see lib/ui/api-client)
 *   Member 5 — `POST /api/commitments/resolve` → suggestions (optional, P2)
 *
 * No dashboard component needs to change when the adapter is swapped.
 */
import type { Commitment, CompletionSuggestion, Message } from "@/types/openloop";

export type LoadState = "loading" | "ready" | "error";

export interface DashboardDataApi {
  /** "demo" while backed by synthetic fixtures; "live" once Member 4's hook is wired. */
  mode: "demo" | "live";
  state: LoadState;
  error: string | null;

  commitments: Commitment[];
  /** Pending completion suggestions from Member 5 (never auto-applied). */
  suggestions: CompletionSuggestion[];

  getCommitment(id: string): Commitment | undefined;
  /** Look up an imported message (for evidence sender/timestamp), if stored. */
  getMessage(id: string): Message | undefined;
  reload(): void;

  // Commitment management (Member 4)
  /** Store newly extracted commitments (and their source messages, if kept). */
  addCommitments(commitments: Commitment[], messages?: Message[]): void;
  markCompleted(id: string): void;
  /** Restore a completed or dismissed commitment to pending. */
  restore(id: string): void;
  dismiss(id: string): void;
  updateDeadline(id: string, dueAt: string | null): void;
  /** Returns a draft follow-up. The user must review it; nothing is sent. */
  generateFollowUp(commitment: Commitment): Promise<string>;

  // Smart resolution (Member 5, optional) — user confirms or rejects
  confirmSuggestion(commitmentId: string): void;
  rejectSuggestion(commitmentId: string): void;

  // Demo-only helpers (optional)
  resetDemo?(): void;
  clearAll?(): void;
}
