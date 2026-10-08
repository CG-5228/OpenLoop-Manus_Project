import { MAX_CONVERSATION_CHARACTERS } from "./parseConversation";
import { ConversationImportError } from "./types";
import { validateImportFile } from "./validateFile";

export async function readTextFile(file: File): Promise<string> {
  if (validateImportFile(file) !== "text") {
    throw new ConversationImportError(
      "unsupported_file",
      "Use a UTF-8 .txt file for text import.",
    );
  }
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
  } catch {
    throw new ConversationImportError(
      "invalid_text",
      "This file could not be read as UTF-8 text. Save it as UTF-8 or paste the conversation instead.",
    );
  }
  if (text.includes("\0")) {
    throw new ConversationImportError("invalid_text", "The file contains binary data.");
  }
  if (!text.trim()) {
    throw new ConversationImportError("empty_file", "The file contains no conversation text.");
  }
  if (text.length > MAX_CONVERSATION_CHARACTERS) {
    throw new ConversationImportError(
      "text_too_long",
      `Use a conversation of ${MAX_CONVERSATION_CHARACTERS.toLocaleString()} characters or fewer.`,
    );
  }
  return text;
}
