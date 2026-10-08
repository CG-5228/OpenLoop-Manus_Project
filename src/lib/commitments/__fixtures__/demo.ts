/**
 * SYNTHETIC DEMO FIXTURES — for the Module D test harness (/dev/commitments)
 * and unit tests only. Not real conversations; not used by production flows.
 * Dates are relative to `now` so overdue/due-soon states are always visible.
 */

import type { Commitment, CompletionSuggestion, Message } from "../types";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export function createDemoCommitments(now: Date = new Date()): Commitment[] {
  const at = (ms: number) => new Date(now.getTime() + ms).toISOString();
  return [
    {
      id: "demo-1",
      title: "Send Sarah the slides",
      promisor: "Me",
      beneficiary: "Sarah",
      direction: "you_owe",
      dueAt: at(5 * HOUR),
      evidenceQuote: "I'll send Sarah the slides tonight.",
      sourceMessageId: "demo-msg-1",
      confidence: "high",
      status: "pending",
    },
    {
      id: "demo-2",
      title: "Email the project report",
      promisor: "James",
      beneficiary: "Me",
      direction: "they_owe",
      dueAt: at(-2 * DAY),
      evidenceQuote: "I'll email you the report by Friday.",
      sourceMessageId: "demo-msg-2",
      confidence: "high",
      status: "pending",
    },
    {
      id: "demo-3",
      title: "Send the API key",
      promisor: "Alex",
      beneficiary: "Me",
      direction: "they_owe",
      dueAt: null,
      evidenceQuote: "I'll send you the API key.",
      sourceMessageId: "demo-msg-3",
      confidence: "high",
      status: "pending",
    },
    {
      id: "demo-4",
      title: "Transfer Sarah €20",
      promisor: "Me",
      beneficiary: "Sarah",
      direction: "you_owe",
      dueAt: at(-3 * HOUR),
      evidenceQuote: "Yeah I'll transfer you the €20 tonight, promise.",
      sourceMessageId: "demo-msg-4",
      confidence: "high",
      status: "pending",
    },
    {
      id: "demo-5",
      title: "Maybe send something next week",
      promisor: "Sarah",
      beneficiary: "Me",
      direction: "they_owe",
      dueAt: null,
      evidenceQuote: "I might send you something next week.",
      sourceMessageId: "demo-msg-5",
      confidence: "low",
      status: "pending",
    },
    {
      id: "demo-6",
      title: "Review Alex's document",
      promisor: "Me",
      beneficiary: "Alex",
      direction: "you_owe",
      dueAt: at(3 * DAY),
      evidenceQuote: "Sure, I'll review your doc before Monday.",
      sourceMessageId: "demo-msg-6",
      confidence: "medium",
      status: "pending",
    },
  ];
}

/** Same commitments as a re-import would produce: new ids, same evidence. */
export function createDuplicateImport(now: Date = new Date()): Commitment[] {
  return createDemoCommitments(now).map((c, i) => ({
    ...c,
    id: `reimport-${i + 1}`,
    sourceMessageId: `reimport-msg-${i + 1}`,
  }));
}

/**
 * The synthetic source messages the demo commitments cite, plus one unrelated
 * message (which the store must NOT keep — only cited evidence is stored).
 */
export function createDemoMessages(now: Date = new Date()): Message[] {
  const sentAt = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * HOUR).toISOString();
  const cited = createDemoCommitments(now).map<Message>((c, i) => ({
    id: c.sourceMessageId,
    conversationId: "demo-conversation",
    sender: c.promisor,
    text: c.evidenceQuote,
    sentAt: sentAt(72 - i),
    source: "paste",
  }));
  return [
    ...cited,
    {
      id: "demo-msg-unrelated",
      conversationId: "demo-conversation",
      sender: "Sarah",
      text: "Maybe we should grab lunch sometime.",
      sentAt: sentAt(60),
      source: "paste",
    },
  ];
}

/** A Module E-style suggestion: James later says he sent the report. */
export function createDemoSuggestion(commitmentId: string): CompletionSuggestion {
  return {
    commitmentId,
    sourceMessageId: "demo-msg-7",
    evidenceQuote: "I've just sent the report I promised.",
    confidence: "high",
    reason: "James states he has sent the report he promised earlier.",
  };
}
