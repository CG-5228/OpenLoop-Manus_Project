import type { Message } from "../../types/openloop";
import { MAX_CONVERSATION_CHARACTERS, parseConversation } from "./parseConversation";
import { ConversationImportError, type ImportSource } from "./types";

export type TextInputMode = "whole-block" | "labelled-chat";

export interface ParseTextInput {
  text: string;
  mode: TextInputMode;
  knownAuthor?: string;
  source?: ImportSource;
  timestampOffset?: string;
}

/** Format-only adapter: never identifies promises or infers an email's author. */
export function parseTextInput(input: ParseTextInput): Message[] {
  if (input.mode === "labelled-chat") {
    return parseConversation({
      text: input.text,
      source: input.source ?? "paste",
      fallbackSender: input.knownAuthor,
      timestampOffset: input.timestampOffset,
    });
  }

  if (input.text.length > MAX_CONVERSATION_CHARACTERS) {
    throw new ConversationImportError("text_too_long", "Use 100,000 characters or fewer.");
  }
  if (!input.text.trim()) return [];

  return [{
    id: crypto.randomUUID(),
    conversationId: crypto.randomUUID(),
    sender: input.knownAuthor?.trim() || "Unknown sender",
    text: input.text,
    sentAt: null,
    source: input.source ?? "paste",
  }];
}
