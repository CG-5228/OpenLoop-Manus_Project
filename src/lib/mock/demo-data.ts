/**
 * DEMO MODE — synthetic fixtures (Brief §6, §12).
 *
 * TEMPORARY PLACEHOLDER (Member 1): typed mock data so the dashboard can be
 * built and tested before Member 4 (storage) and Member 3 (AI extraction) are
 * merged. Every conversation, name and message here is fictional.
 *
 * These fixtures are NOT AI output and must never be shown as such. The UI
 * labels them "Demo data". Remove or gate them behind an explicit demo toggle
 * before final submission.
 */
import type { Commitment, CompletionSuggestion, Message } from "@/types/openloop";

export const DEMO_CURRENT_USER = "Me";

export interface DemoDataset {
  commitments: Commitment[];
  suggestions: CompletionSuggestion[];
  messages: Message[];
}

/** Dates are generated relative to `now` so demos always look current. */
export function createDemoDataset(now = new Date()): DemoDataset {
  const at = (dayOffset: number, hours: number, minutes = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  };
  const ago = (minutes: number) =>
    new Date(now.getTime() - minutes * 60_000).toISOString();

  const messages: Message[] = [
    { id: "msg-sarah-1", conversationId: "conv-sarah", sender: "Sarah", text: "Can you send me the slides from today? I want to go over them before the client call.", sentAt: ago(190), source: "paste" },
    { id: "msg-me-1", conversationId: "conv-sarah", sender: "Me", text: "I'll send Sarah the slides tonight.", sentAt: ago(185), source: "paste" },
    { id: "msg-sarah-2", conversationId: "conv-sarah", sender: "Sarah", text: "Can you transfer me €20 tonight for the pizza?", sentAt: at(-1, 19, 12), source: "paste" },
    { id: "msg-me-2", conversationId: "conv-sarah", sender: "Me", text: "Sure, I'll transfer you the €20 tonight.", sentAt: at(-1, 19, 14), source: "paste" },
    { id: "msg-sarah-3", conversationId: "conv-sarah", sender: "Sarah", text: "I'll pay you back for the concert tickets on Monday, promise!", sentAt: at(-6, 21, 3), source: "paste" },
    { id: "msg-james-1", conversationId: "conv-james", sender: "James", text: "I'll email you the report by Friday.", sentAt: at(-2, 10, 41), source: "txt" },
    { id: "msg-james-2", conversationId: "conv-james", sender: "James", text: "I've just sent the report I promised — let me know if anything's missing.", sentAt: ago(42), source: "txt" },
    { id: "msg-alex-1", conversationId: "conv-alex", sender: "Alex", text: "I'll send you the API key.", sentAt: at(-1, 15, 20), source: "image" },
    { id: "msg-me-3", conversationId: "conv-alex", sender: "Me", text: "Happy to — I'll review your doc before Friday's standup.", sentAt: at(-1, 15, 24), source: "image" },
    { id: "msg-priya-1", conversationId: "conv-priya", sender: "Me", text: "Let me check with the team and I'll get back to you about the venue next week.", sentAt: at(-1, 11, 5), source: "paste" },
    { id: "msg-maya-1", conversationId: "conv-design", sender: "Maya", text: "I'll probably share the Figma file at some point tomorrow, if I get through the edits.", sentAt: at(-1, 17, 30), source: "paste" },
    { id: "msg-tom-1", conversationId: "conv-design", sender: "Tom", text: "Someone needs to book the room for Thursday — I can do it if nobody else gets to it.", sentAt: at(-1, 17, 34), source: "paste" },
    { id: "msg-me-4", conversationId: "conv-lena", sender: "Me", text: "I'll send you the onboarding checklist first thing tomorrow.", sentAt: at(-4, 9, 2), source: "paste" },
    { id: "msg-ben-1", conversationId: "conv-ben", sender: "Ben", text: "We should grab coffee sometime!", sentAt: at(-3, 13, 0), source: "paste" },
  ];

  const commitments: Commitment[] = [
    { id: "cmt-slides", title: "Send Sarah the slides", promisor: "Me", beneficiary: "Sarah", direction: "you_owe", dueAt: at(0, 22, 0), evidenceQuote: "I'll send Sarah the slides tonight.", sourceMessageId: "msg-me-1", confidence: "high", status: "pending" },
    { id: "cmt-transfer", title: "Transfer Sarah €20", promisor: "Me", beneficiary: "Sarah", direction: "you_owe", dueAt: at(-1, 23, 59), evidenceQuote: "Sure, I'll transfer you the €20 tonight.", sourceMessageId: "msg-me-2", confidence: "high", status: "pending" },
    { id: "cmt-review-doc", title: "Review Alex's document", promisor: "Me", beneficiary: "Alex", direction: "you_owe", dueAt: at(3, 9, 30), evidenceQuote: "I'll review your doc before Friday's standup.", sourceMessageId: "msg-me-3", confidence: "high", status: "pending" },
    { id: "cmt-venue", title: "Get back to Priya about the venue", promisor: "Me", beneficiary: "Priya", direction: "you_owe", dueAt: at(7, 0, 0), evidenceQuote: "I'll get back to you about the venue next week.", sourceMessageId: "msg-priya-1", confidence: "medium", status: "pending" },
    { id: "cmt-report", title: "Email the project report", promisor: "James", beneficiary: "Me", direction: "they_owe", dueAt: at(2, 17, 0), evidenceQuote: "I'll email you the report by Friday.", sourceMessageId: "msg-james-1", confidence: "high", status: "pending" },
    { id: "cmt-api-key", title: "Send the API key", promisor: "Alex", beneficiary: "Me", direction: "they_owe", dueAt: null, evidenceQuote: "I'll send you the API key.", sourceMessageId: "msg-alex-1", confidence: "high", status: "pending" },
    { id: "cmt-tickets", title: "Pay back for the concert tickets", promisor: "Sarah", beneficiary: "Me", direction: "they_owe", dueAt: at(-2, 0, 0), evidenceQuote: "I'll pay you back for the concert tickets on Monday, promise!", sourceMessageId: "msg-sarah-3", confidence: "high", status: "pending" },
    { id: "cmt-figma", title: "Share the Figma file", promisor: "Maya", beneficiary: "Me", direction: "they_owe", dueAt: at(1, 0, 0), evidenceQuote: "I'll probably share the Figma file at some point tomorrow, if I get through the edits.", sourceMessageId: "msg-maya-1", confidence: "low", status: "pending" },
    { id: "cmt-room", title: "Book the meeting room for Thursday", promisor: "Tom", beneficiary: null, direction: "unknown", dueAt: null, evidenceQuote: "I can do it if nobody else gets to it.", sourceMessageId: "msg-tom-1", confidence: "low", status: "pending" },
    { id: "cmt-checklist", title: "Send Lena the onboarding checklist", promisor: "Me", beneficiary: "Lena", direction: "you_owe", dueAt: at(-3, 9, 0), evidenceQuote: "I'll send you the onboarding checklist first thing tomorrow.", sourceMessageId: "msg-me-4", confidence: "high", status: "completed" },
    { id: "cmt-coffee", title: "Grab coffee with Ben", promisor: "Ben", beneficiary: "Me", direction: "they_owe", dueAt: null, evidenceQuote: "We should grab coffee sometime!", sourceMessageId: "msg-ben-1", confidence: "low", status: "dismissed" },
  ];

  const suggestions: CompletionSuggestion[] = [
    { commitmentId: "cmt-report", sourceMessageId: "msg-james-2", evidenceQuote: "I've just sent the report I promised", confidence: "high", reason: "James says he has sent the report he promised earlier in the conversation." },
  ];

  return { commitments, suggestions, messages };
}
