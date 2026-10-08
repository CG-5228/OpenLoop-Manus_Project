"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  parseConversation,
  readScreenshot,
  readTextFile,
  SAMPLE_CONVERSATION,
  SAMPLE_CURRENT_USER,
  SAMPLE_REFERENCE_DATE,
  validateImportFile,
  type ConversationImportPayload,
  type ExtractImageText,
  type ImportSource,
} from "../../lib/conversation";

export interface UseConversationImportOptions {
  onImport: (payload: ConversationImportPayload) => void | Promise<void>;
  extractImageText?: ExtractImageText;
  timestampOffset?: string;
}

export function useConversationImport({ onImport, extractImageText, timestampOffset }: UseConversationImportOptions) {
  const [text, setRawText] = useState("");
  const [source, setSource] = useState<ImportSource>("paste");
  const [conversationId, setConversationId] = useState("");
  const [currentUserLabel, setCurrentUserLabel] = useState("");
  const [referenceDate, setReferenceDate] = useState("");
  const [phase, setPhase] = useState<"idle" | "reading" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => () => { requestId.current += 1; }, []);

  const preview = useMemo(() => {
    try {
      return {
        messages: parseConversation({ text, source, conversationId, timestampOffset }),
        error: null,
      };
    } catch (cause) {
      return { messages: [], error: cause instanceof Error ? cause.message : "Unable to parse this conversation." };
    }
  }, [text, source, conversationId, timestampOffset]);
  const senders = useMemo(() => [...new Set(preview.messages.map((message) => message.sender))], [preview.messages]);
  const busy = phase !== "idle";
  const canSubmit = !busy && !preview.error && preview.messages.length > 0 && senders.includes(currentUserLabel.trim());

  function setText(value: string) {
    if (!conversationId) setConversationId(crypto.randomUUID());
    setRawText(value);
    setError(null);
    setNotice(null);
  }

  function loadSample() {
    setRawText(SAMPLE_CONVERSATION);
    setSource("paste");
    setConversationId(crypto.randomUUID());
    setCurrentUserLabel(SAMPLE_CURRENT_USER);
    setReferenceDate(SAMPLE_REFERENCE_DATE);
    setError(null);
    setNotice("Fictional sample loaded. Review the messages before analysis.");
  }

  function reset() {
    requestId.current += 1;
    setRawText("");
    setSource("paste");
    setConversationId(crypto.randomUUID());
    setCurrentUserLabel("");
    setReferenceDate("");
    setPhase("idle");
    setError(null);
    setNotice(null);
  }

  async function importFile(file: File) {
    const id = ++requestId.current;
    setPhase("reading");
    setError(null);
    setNotice(null);
    try {
      const kind = validateImportFile(file);
      const importedText = kind === "text"
        ? await readTextFile(file)
        : await readScreenshot(file, extractImageText, (progress) => {
            if (requestId.current === id) setNotice(progress.label);
          });
      if (requestId.current !== id) return;
      setRawText(importedText);
      setSource(kind === "text" ? "txt" : "image");
      setConversationId(crypto.randomUUID());
      setCurrentUserLabel("");
      setReferenceDate("");
      setNotice(kind === "image" ? "Screenshot text loaded. Correct OCR errors before analysis." : "Text file loaded. Review the conversation before analysis.");
    } catch (cause) {
      if (requestId.current === id) {
        setNotice(null);
        setError(cause instanceof Error ? cause.message : "The file could not be imported.");
      }
    } finally {
      if (requestId.current === id) setPhase("idle");
    }
  }

  async function submit() {
    if (!canSubmit) return;
    const id = ++requestId.current;
    setPhase("submitting");
    setError(null);
    setNotice(null);
    try {
      await onImport({
        messages: preview.messages,
        currentUserLabel: currentUserLabel.trim(),
        ...(referenceDate ? { referenceDate } : {}),
      });
      if (requestId.current === id) setNotice("Conversation handed to the application.");
    } catch (cause) {
      if (requestId.current === id) setError(cause instanceof Error ? cause.message : "The application could not accept the conversation. Try again.");
    } finally {
      if (requestId.current === id) setPhase("idle");
    }
  }

  return {
    text, source, currentUserLabel, referenceDate, messages: preview.messages, senders,
    busy, phase, canSubmit, error: error ?? preview.error, notice,
    setText, setCurrentUserLabel, setReferenceDate, loadSample, reset, importFile, submit,
  };
}
