export function message(sender, text, id = "m1", overrides = {}) {
  return { id, conversationId: "synthetic-conversation", sender, text, sentAt: null, source: "paste", ...overrides };
}

export const sampleRequest = {
  messages: [
    message("Me", "I'll send Sarah the slides by 8 tonight.", "sample-message-1"),
    message("James", "I'll email you the report tomorrow.", "sample-message-2"),
    message("Me", "I'll transfer Sam €20 on Friday.", "sample-message-3"),
    message("Alex", "I'll send you the API key.", "sample-message-4"),
    message("Sarah", "I might review your CV sometime.", "sample-message-5"),
  ],
  currentUserLabel: "Me",
  referenceDate: "2026-10-08",
};

export function candidate(overrides = {}) {
  return {
    title: "Email the report", beneficiary: "Me", dueAt: "2026-10-09", deadlineQuote: "tomorrow",
    evidenceQuote: "I'll email you the report tomorrow.", sourceMessageId: "sample-message-2", confidence: "high", ...overrides,
  };
}
