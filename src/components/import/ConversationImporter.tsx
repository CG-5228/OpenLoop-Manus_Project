"use client";

import { ConversationDateInput } from "./ConversationDateInput";
import { ConversationFileUpload } from "./ConversationFileUpload";
import { ConversationTextInput } from "./ConversationTextInput";
import { MessagePreview } from "./MessagePreview";
import { SenderSelector } from "./SenderSelector";
import { useConversationImport, type UseConversationImportOptions } from "./useConversationImport";

export interface ConversationImporterProps extends UseConversationImportOptions {
  className?: string;
}

/** Member 1 mounts this; Member 3 owns the analysis called by onImport. */
export function ConversationImporter({ className = "", ...options }: ConversationImporterProps) {
  const state = useConversationImport(options);
  return (
    <form
      aria-label="Import conversation"
      aria-busy={state.busy}
      className={`space-y-6 ${className}`}
      onSubmit={(event) => { event.preventDefault(); void state.submit(); }}
    >
      <header className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-900">Import a conversation</h2>
        <p className="text-sm text-slate-600">Paste a chat, review the messages, and identify your sender name.</p>
        <p className="text-xs text-slate-500">Use fictional data for the demo. Your text will be passed to the application's AI analysis when you submit; do not include sensitive details.</p>
      </header>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={state.loadSample} disabled={state.busy} className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-60">Try sample conversation</button>
        <button type="button" onClick={state.reset} disabled={state.busy} className="rounded-md px-3 py-2 text-sm text-slate-600 disabled:opacity-60">Clear</button>
      </div>
      <ConversationFileUpload onSelect={(file) => { void state.importFile(file); }} ocrAvailable={Boolean(options.extractImageText)} disabled={state.busy} />
      <ConversationTextInput value={state.text} onChange={state.setText} disabled={state.busy} />
      <MessagePreview messages={state.messages} />
      <SenderSelector senders={state.senders} value={state.currentUserLabel} onChange={state.setCurrentUserLabel} disabled={state.busy} />
      <ConversationDateInput value={state.referenceDate} onChange={state.setReferenceDate} disabled={state.busy} />
      {state.text && !options.timestampOffset && (
        <p className="text-xs text-slate-500">Timestamps without a timezone remain unknown. The application can supply an explicit timezone offset.</p>
      )}
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      <div role="status" aria-live="polite" className="text-sm text-slate-600">
        {state.phase === "reading" ? (state.notice ?? "Reading your file…") : state.notice}
      </div>
      <button type="submit" disabled={!state.canSubmit} className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">
        {state.phase === "submitting" ? "Passing messages to the application…" : "Send messages for analysis"}
      </button>
    </form>
  );
}
