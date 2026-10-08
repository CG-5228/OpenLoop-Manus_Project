import type { Message } from "../../types/openloop";
import { ConversationImportError, type ParseConversationInput } from "./types";

export const MAX_CONVERSATION_CHARACTERS = 100_000;

const TIMESTAMP_PREFIX =
  /^(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})?)\s*\|\s*(.*)$/;
const SPEAKER_PREFIX = /^([^:\n]{1,80}):\s*(.*)$/;
const OFFSET = /^(?:Z|[+-](?:0\d|1[0-3]):[0-5]\d|[+-]14:00)$/;

function parseTimestamp(value: string, offset?: string): string | null {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:\d{2})?$/,
  );
  if (!match) return null;

  const [, year, month, day, hour, minute, second = "00", zone] = match;
  const wallTime = new Date(
    Date.UTC(+year, +month - 1, +day, +hour, +minute, +second),
  );
  if (
    wallTime.getUTCFullYear() !== +year ||
    wallTime.getUTCMonth() !== +month - 1 ||
    wallTime.getUTCDate() !== +day ||
    wallTime.getUTCHours() !== +hour ||
    wallTime.getUTCMinutes() !== +minute ||
    wallTime.getUTCSeconds() !== +second
  ) {
    return null;
  }

  const knownZone = zone ?? offset;
  if (!knownZone || !OFFSET.test(knownZone)) return null;
  const date = new Date(
    `${year}-${month}-${day}T${hour}:${minute}:${second}${knownZone}`,
  );
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Format parsing only: this function never detects promises or commitments. */
export function parseConversation(input: ParseConversationInput): Message[] {
  if (input.text.length > MAX_CONVERSATION_CHARACTERS) {
    throw new ConversationImportError(
      "text_too_long",
      `Use a conversation of ${MAX_CONVERSATION_CHARACTERS.toLocaleString()} characters or fewer.`,
    );
  }
  if (input.timestampOffset && !OFFSET.test(input.timestampOffset)) {
    throw new ConversationImportError(
      "invalid_offset",
      "Use an explicit timezone offset such as +01:00 or Z.",
    );
  }
  if (!input.text.trim()) return [];

  const conversationId = input.conversationId ?? crypto.randomUUID();
  const fallbackSender = input.fallbackSender?.trim() || "Unknown sender";
  const messages: Message[] = [];

  for (const line of input.text.replace(/\r\n?/g, "\n").split("\n")) {
    const timestampMatch = line.trim().match(TIMESTAMP_PREFIX);
    const content = timestampMatch ? timestampMatch[2] : line;
    // A standalone URL is content, not a sender named "https".
    const speakerMatch = /^\s*(?:https?:\/\/|mailto:|tel:)/i.test(content)
      ? null
      : content.trim().match(SPEAKER_PREFIX);
    const sender = speakerMatch?.[1].trim();
    const text = speakerMatch ? speakerMatch[2] : content;

    if (sender || timestampMatch) {
      messages.push({
        id: crypto.randomUUID(),
        conversationId,
        sender: sender || fallbackSender,
        text,
        sentAt: timestampMatch
          ? parseTimestamp(timestampMatch[1], input.timestampOffset)
          : null,
        source: input.source,
      });
    } else if (messages.length > 0) {
      // Unlabelled lines belong to the previous message, including paragraph breaks.
      messages[messages.length - 1].text += `\n${line}`;
    } else if (line.trim()) {
      messages.push({
        id: crypto.randomUUID(),
        conversationId,
        sender: fallbackSender,
        text: line,
        sentAt: null,
        source: input.source,
      });
    }
  }

  return messages
    .map((message) => ({ ...message, text: message.text.trim() }))
    .filter((message) => message.text.length > 0);
}
