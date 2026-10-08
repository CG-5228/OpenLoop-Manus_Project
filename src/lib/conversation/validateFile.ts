import { ConversationImportError } from "./types";

export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
export const TEXT_FILE_ACCEPT = ".txt,text/plain";
export const IMAGE_FILE_ACCEPT = ".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp";

export type ImportFileKind = "text" | "image";
export type ImportFileMetadata = Pick<File, "name" | "type" | "size">;

const FILE_TYPES: Record<string, { kind: ImportFileKind; mime: string }> = {
  txt: { kind: "text", mime: "text/plain" },
  png: { kind: "image", mime: "image/png" },
  jpg: { kind: "image", mime: "image/jpeg" },
  jpeg: { kind: "image", mime: "image/jpeg" },
  webp: { kind: "image", mime: "image/webp" },
};

export function validateImportFile(file: ImportFileMetadata): ImportFileKind {
  if (file.size === 0) {
    throw new ConversationImportError("empty_file", "The selected file is empty.");
  }
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    throw new ConversationImportError(
      "file_too_large",
      "Choose a file no larger than 5 MiB.",
    );
  }
  const extension = file.name.match(/\.([^.]+)$/)?.[1].toLowerCase() ?? "";
  const format = Object.hasOwn(FILE_TYPES, extension) ? FILE_TYPES[extension] : undefined;
  if (!format || (file.type && file.type !== format.mime)) {
    throw new ConversationImportError(
      "unsupported_file",
      "Choose a UTF-8 .txt file, or a PNG, JPEG or WebP screenshot when OCR is connected.",
    );
  }
  return format.kind;
}
