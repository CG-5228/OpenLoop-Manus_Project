import { MAX_CONVERSATION_CHARACTERS } from "./parseConversation";
import {
  ConversationImportError,
  type ExtractImageText,
  type OcrProgress,
} from "./types";
import { validateImportFile } from "./validateFile";

export async function readScreenshot(
  file: File,
  extractImageText?: ExtractImageText,
  onProgress?: (progress: OcrProgress) => void,
): Promise<string> {
  if (validateImportFile(file) !== "image") {
    throw new ConversationImportError("unsupported_file", "Choose a supported screenshot image.");
  }
  if (!extractImageText) {
    throw new ConversationImportError(
      "ocr_unavailable",
      "Screenshot OCR is not connected yet. Paste the conversation or upload a .txt file.",
    );
  }
  const text = await extractImageText(file, onProgress);
  if (typeof text !== "string" || !text.trim()) {
    throw new ConversationImportError(
      "invalid_text",
      "No readable text was returned. Try a clearer image or paste the conversation.",
    );
  }
  if (text.length > MAX_CONVERSATION_CHARACTERS) {
    throw new ConversationImportError("text_too_long", "The extracted text is too long. Import a shorter conversation.");
  }
  return text;
}
