import type { Message } from "../../types/openloop";

export type MessageSource = Message["source"];
export type ImportSource = Extract<MessageSource, "paste" | "txt" | "image">;

export interface ParseConversationInput {
  text: string;
  source: ImportSource;
  conversationId?: string;
  /** An explicit label for unattributed text, never a guessed speaker. */
  fallbackSender?: string;
  /** e.g. "+01:00"; timestamps without a known offset remain null. */
  timestampOffset?: string;
}

export interface ConversationImportPayload {
  messages: Message[];
  currentUserLabel: string;
  /** Explicit YYYY-MM-DD context supplied by the user, not an invented deadline. */
  referenceDate?: string;
}

export interface OcrProgress {
  fraction: number;
  label: string;
}

/** Implement this with real OCR; do not return demo text for uploaded images. */
export type ExtractImageText = (
  file: File,
  onProgress?: (progress: OcrProgress) => void,
) => Promise<string>;

export type ConversationImportErrorCode =
  | "unsupported_file"
  | "empty_file"
  | "file_too_large"
  | "invalid_text"
  | "text_too_long"
  | "invalid_offset"
  | "ocr_unavailable";

export class ConversationImportError extends Error {
  constructor(
    public readonly code: ConversationImportErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ConversationImportError";
  }
}
