"use client";

import { useId } from "react";
import { IMAGE_FILE_ACCEPT, TEXT_FILE_ACCEPT } from "../../lib/conversation";

export interface ConversationFileUploadProps {
  onSelect: (file: File) => void;
  ocrAvailable?: boolean;
  disabled?: boolean;
}

export function ConversationFileUpload({ onSelect, ocrAvailable = false, disabled }: ConversationFileUploadProps) {
  const id = useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block font-medium">Upload a conversation file</label>
      <input
        id={id}
        type="file"
        accept={ocrAvailable ? `${TEXT_FILE_ACCEPT},${IMAGE_FILE_ACCEPT}` : TEXT_FILE_ACCEPT}
        aria-describedby={`${id}-help`}
        disabled={disabled}
        className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 disabled:opacity-60"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onSelect(file);
        }}
      />
      <p id={`${id}-help`} className="text-xs text-slate-500">
        UTF-8 .txt files{ocrAvailable ? ", PNG, JPEG or WebP screenshots" : ""}; up to 5 MiB.
        {!ocrAvailable && " Screenshot OCR is not connected yet."}
      </p>
    </div>
  );
}
