import type { Commitment, Message } from "../../types/openloop";

export interface CommitmentPreviewRequest {
  messages: Message[];
  currentUserLabel: string;
  referenceDate?: string;
}

export function isCommitmentPreview(value: unknown): value is Commitment {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return ["id", "title", "promisor", "evidenceQuote", "sourceMessageId"].every(key => typeof item[key] === "string")
    && typeof item.evidenceQuote === "string" && item.evidenceQuote.trim().length > 0
    && (item.beneficiary === null || typeof item.beneficiary === "string")
    && (item.dueAt === null || typeof item.dueAt === "string")
    && ["you_owe", "they_owe", "unknown"].includes(String(item.direction))
    && ["high", "medium", "low"].includes(String(item.confidence))
    && ["pending", "completed", "dismissed"].includes(String(item.status));
}

/** This deliberate action sends text to the existing server-side AI endpoint. */
export async function requestCommitments(
  payload: CommitmentPreviewRequest,
  signal?: AbortSignal,
): Promise<Commitment[]> {
  const response = await fetch("/api/commitments/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
    cache: "no-store",
  });
  let data: unknown;
  try { data = await response.json(); } catch {
    throw new Error("The AI endpoint is not connected in this build or returned an unreadable response.");
  }
  if (!response.ok) {
    const record = data && typeof data === "object" ? data as Record<string, unknown> : {};
    const error = record.error && typeof record.error === "object" ? record.error as Record<string, unknown> : {};
    throw new Error(typeof error.message === "string" && error.message.trim() ? error.message : "AI analysis failed. Please try again.");
  }
  const items = data && typeof data === "object" ? (data as Record<string, unknown>).commitments : undefined;
  if (!Array.isArray(items) || !items.every(isCommitmentPreview)) {
    throw new Error("The AI endpoint returned an invalid commitment response.");
  }
  return items;
}
