/**
 * Shared domain contract for every OpenLoop feature branch.
 *
 * Do not change these fields independently. Coordinate any proposed change
 * with the integration owner before merging it to main.
 */
export type Source = "paste" | "txt" | "image";
export type Confidence = "high" | "medium" | "low";
export type Direction = "you_owe" | "they_owe" | "unknown";
export type CommitmentStatus = "pending" | "completed" | "dismissed";

export interface Message {
  id: string;
  conversationId: string;
  sender: string;
  text: string;
  /** ISO date-time when known. */
  sentAt: string | null;
  source: Source;
}

export interface Commitment {
  id: string;
  /** Concise action description. */
  title: string;
  promisor: string;
  beneficiary: string | null;
  direction: Direction;
  /** ISO date or date-time when known; otherwise null. */
  dueAt: string | null;
  /** Exact text from the source message. */
  evidenceQuote: string;
  sourceMessageId: string;
  confidence: Confidence;
  status: CommitmentStatus;
}

export interface CompletionSuggestion {
  commitmentId: string;
  sourceMessageId: string;
  evidenceQuote: string;
  confidence: Confidence;
  reason: string;
}
