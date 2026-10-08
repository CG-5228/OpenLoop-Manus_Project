"use client";

/**
 * ImporterSlot — the conversation importer, built on Member 2's
 * `useConversationImport` hook (parsing, sample, .txt reading, sender list,
 * validation) with OpenLoop's visual design. `onImport` receives Member 2's
 * `ConversationImportPayload` and is handled by `useImportFlow`
 * (extraction → storage → dashboard).
 */
import { useEffect, useId, useRef } from "react";
import { ArrowRight, FileText, FlaskConical, RotateCcw, Sparkles, Upload } from "lucide-react";
import { useConversationImport } from "@/components/import";
import { TEXT_FILE_ACCEPT } from "@/lib/conversation";
import type { ImportPayload } from "@/components/import-flow/use-import-flow";
import type { ExtractionMode } from "@/lib/ui/api-client";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const PLACEHOLDER = `Paste a chat, one message per line:

2026-10-08 17:00 | Me: I'll send Sarah the slides by 8 tonight.
2026-10-08 17:01 | James: I'll email you the report tomorrow.`;

export function ImporterSlot({
  onImport,
  extractionMode,
}: {
  onImport: (payload: ImportPayload) => Promise<void>;
  extractionMode: ExtractionMode;
}) {
  const imp = useConversationImport({ onImport });
  const fileInput = useRef<HTMLInputElement>(null);
  const textId = useId();
  const dateId = useId();

  // `/import?sample=1` (from the dashboard and landing page) preloads the fictional sample.
  const loadSample = useRef(imp.loadSample);
  useEffect(() => {
    loadSample.current = imp.loadSample;
  });
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("sample") === "1") {
      const timer = window.setTimeout(() => loadSample.current(), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const count = imp.messages.length;
  const meChosen = imp.senders.includes(imp.currentUserLabel.trim());
  const blocker = imp.busy
    ? null
    : !imp.text.trim()
      ? "Paste a conversation or load the sample to begin."
      : count > 0 && !meChosen
        ? "Choose which sender is you."
        : null;

  return (
    <form
      className="overflow-hidden rounded-[18px] border border-line bg-surface shadow-card"
      onSubmit={(e) => {
        e.preventDefault();
        void imp.submit();
      }}
    >
      {/* Source bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
        <label htmlFor={textId} className="text-[13px] font-semibold text-ink">
          Conversation
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button type="button" variant="secondary" size="sm" onClick={imp.loadSample} disabled={imp.busy}>
            <Sparkles /> Try sample
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInput.current?.click()}
            disabled={imp.busy}
          >
            <Upload /> Upload .txt
          </Button>
          {imp.text && (
            <Button type="button" variant="ghost" size="sm" onClick={imp.reset} disabled={imp.busy}>
              <RotateCcw /> Clear
            </Button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept={TEXT_FILE_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-label="Upload a .txt conversation export"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void imp.importFile(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Text */}
      <textarea
        id={textId}
        value={imp.text}
        onChange={(e) => imp.setText(e.target.value)}
        placeholder={PLACEHOLDER}
        spellCheck={false}
        rows={9}
        disabled={imp.phase === "reading"}
        className="block min-h-[220px] w-full resize-y bg-surface px-4 py-4 font-mono text-[13px] leading-[1.7] text-ink outline-none placeholder:text-ink-3 sm:px-5"
      />

      <div className="space-y-5 border-t border-line bg-canvas/60 px-4 py-5 sm:px-5">
        {/* Parse status */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
          {count > 0 ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-ink">
              <FileText className="size-4 text-ink-3" aria-hidden />
              {count} message{count === 1 ? "" : "s"} from {imp.senders.length} sender
              {imp.senders.length === 1 ? "" : "s"}
            </span>
          ) : (
            <span className="text-ink-3">
              Format: <span className="font-mono text-ink-2">Name: message</span>, optionally prefixed with{" "}
              <span className="font-mono text-ink-2">YYYY-MM-DD HH:mm |</span>
            </span>
          )}
          {imp.notice && <span className="text-ink-2">{imp.notice}</span>}
        </div>

        {imp.error && (
          <p role="alert" className="rounded-[10px] bg-overdue-bg px-3 py-2 text-[13px] text-overdue-fg">
            {imp.error}
          </p>
        )}

        {/* Who is you */}
        {imp.senders.length > 0 && (
          <fieldset>
            <legend className="text-[13px] font-semibold text-ink">Which sender is you?</legend>
            <p className="mt-0.5 text-[12px] text-ink-3">
              This decides what you owe and what others owe you.
            </p>
            <div role="radiogroup" aria-label="Which sender is you?" className="mt-2.5 flex flex-wrap gap-2">
              {imp.senders.map((sender) => {
                const active = imp.currentUserLabel === sender;
                return (
                  <button
                    key={sender}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => imp.setCurrentUserLabel(sender)}
                    className={cn(
                      "inline-flex h-9 items-center gap-2 rounded-full border pl-1.5 pr-3.5 text-[13px] font-medium transition-colors",
                      active
                        ? "border-ink bg-ink text-ink-inverse"
                        : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink",
                    )}
                  >
                    <Avatar name={sender} size="sm" />
                    {sender}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {/* Reference date */}
        {count > 0 && (
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <div>
              <label htmlFor={dateId} className="text-[13px] font-semibold text-ink">
                Conversation date <span className="font-normal text-ink-3">(optional)</span>
              </label>
              <p className="mt-0.5 text-[12px] text-ink-3">
                Resolves “tomorrow” or “Friday” when messages have no timestamps.
              </p>
            </div>
            <input
              id={dateId}
              type="date"
              value={imp.referenceDate}
              onChange={(e) => imp.setReferenceDate(e.target.value)}
              className="h-9 rounded-[10px] border border-line bg-surface px-3 text-[13px] text-ink outline-none focus-visible:border-ink"
            />
          </div>
        )}

        {/* Preview */}
        {count > 0 && (
          <details className="rounded-[12px] border border-line bg-surface">
            <summary className="cursor-pointer select-none px-3.5 py-2.5 text-[13px] font-medium text-ink-2 hover:text-ink">
              Preview parsed messages
            </summary>
            <ol className="max-h-[260px] space-y-2 overflow-auto border-t border-line px-3.5 py-3">
              {imp.messages.map((m) => (
                <li key={m.id} className="flex gap-2.5 text-[13px] leading-relaxed">
                  <span
                    className={cn(
                      "shrink-0 font-semibold",
                      m.sender === imp.currentUserLabel ? "text-ink" : "text-ink-2",
                    )}
                  >
                    {m.sender}
                  </span>
                  <span className="text-ink-2">{m.text}</span>
                </li>
              ))}
            </ol>
          </details>
        )}

        {/* Submit */}
        <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 text-[12px] text-ink-3">
            {blocker && <p>{blocker}</p>}
            {extractionMode === "demo" && (
              <p className="inline-flex items-center gap-1.5">
                <FlaskConical className="size-3.5" aria-hidden />
                Demo extraction: rule-based, no AI provider connected.
              </p>
            )}
          </div>
          <Button type="submit" variant="primary" size="lg" disabled={!imp.canSubmit}>
            {imp.phase === "submitting" ? "Analysing…" : "Find commitments"} <ArrowRight />
          </Button>
        </div>
      </div>
    </form>
  );
}
