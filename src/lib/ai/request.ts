import type { Message } from "@/types/openloop";
import { isIsoDate, isIsoDateTime } from "./dates";
import { ExtractionError, invalidInput } from "./errors";

export const LIMITS = {
  bodyBytes: 1_048_576,
  messages: 500,
  textCharacters: 100_000,
  commitments: 100,
  providerResponseBytes: 1_048_576,
} as const;

export interface ExtractionRequest {
  messages: Message[];
  currentUserLabel: string;
  referenceDate?: string;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function identityKey(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en");
}

export function isUnknownSender(value: string): boolean {
  return /^(unknown(?: sender)?|unattributed|anonymous)$/i.test(value.trim());
}

function requiredString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim()) invalidInput(`${field} must be a non-empty string.`);
  if (value.length > maxLength) invalidInput(`${field} must be at most ${maxLength} characters.`);
  return value;
}

export function validateExtractionRequest(value: unknown): ExtractionRequest {
  if (!isRecord(value)) invalidInput("Expected a JSON object with messages and currentUserLabel.");
  if (!Array.isArray(value.messages) || value.messages.length === 0) invalidInput("messages must be a non-empty array.");
  if (value.messages.length > LIMITS.messages) throw new ExtractionError("INPUT_TOO_LARGE", `Use at most ${LIMITS.messages} messages per analysis.`, 413);
  const currentUserLabel = requiredString(value.currentUserLabel, "currentUserLabel", 200).trim();
  if (isUnknownSender(currentUserLabel)) invalidInput("Choose your own sender name, not an unknown-sender placeholder.");
  let referenceDate: string | undefined;
  if (value.referenceDate !== undefined) {
    if (typeof value.referenceDate !== "string" || !isIsoDate(value.referenceDate)) invalidInput("referenceDate must be a valid YYYY-MM-DD date.");
    referenceDate = value.referenceDate;
  }
  const ids = new Set<string>();
  let totalCharacters = 0;
  const messages = value.messages.map((raw: unknown, index: number): Message => {
    const field = `messages[${index}]`;
    if (!isRecord(raw)) invalidInput(`${field} must be an object.`);
    const id = requiredString(raw.id, `${field}.id`, 128);
    if (ids.has(id)) invalidInput("Message IDs must be unique within one request.");
    ids.add(id);
    const conversationId = requiredString(raw.conversationId, `${field}.conversationId`, 128);
    const sender = requiredString(raw.sender, `${field}.sender`, 200);
    if (typeof raw.text === "string" && raw.text.length > LIMITS.textCharacters) throw new ExtractionError("INPUT_TOO_LARGE", `Use at most ${LIMITS.textCharacters} total message characters.`, 413);
    const text = requiredString(raw.text, `${field}.text`, LIMITS.textCharacters);
    totalCharacters += text.length;
    if (totalCharacters > LIMITS.textCharacters) throw new ExtractionError("INPUT_TOO_LARGE", `Use at most ${LIMITS.textCharacters} total message characters.`, 413);
    if (raw.sentAt !== null && (typeof raw.sentAt !== "string" || !isIsoDateTime(raw.sentAt))) invalidInput(`${field}.sentAt must be null or an ISO timestamp with an explicit timezone.`);
    if (raw.source !== "paste" && raw.source !== "txt" && raw.source !== "image") invalidInput(`${field}.source must be paste, txt, or image.`);
    return { id, conversationId, sender, text, sentAt: raw.sentAt, source: raw.source };
  });
  return { messages, currentUserLabel, ...(referenceDate ? { referenceDate } : {}) };
}
