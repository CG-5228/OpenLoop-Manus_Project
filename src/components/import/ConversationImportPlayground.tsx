"use client";

import { useId, useState } from "react";
import type { ConversationImportPayload } from "../../lib/conversation";
import { ConversationImporter } from "./ConversationImporter";

export function ConversationImportPlayground() {
  const [payload, setPayload] = useState<ConversationImportPayload | null>(null);
  const [offset, setOffset] = useState("");
  const offsetId = useId();

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 text-slate-900 sm:px-8">
      <header className="mb-8 space-y-3 border-b border-slate-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-700">OpenLoop · Member 2 test playground</p>
        <h1 className="text-3xl font-semibold tracking-tight">Test conversation parsing</h1>
        <p className="max-w-3xl text-slate-600">Try the sample, paste a conversation or upload a UTF-8 .txt file. Review the speakers and text, identify yourself, then preview the exact messages that would be handed to the application.</p>
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900"><strong>Parser-only test.</strong> This page does not detect promises, run AI, save conversations or send message input to a server. Screenshot OCR is not connected.</p>
      </header>

      <div className="mb-6 space-y-2">
        <label htmlFor={offsetId} className="block text-sm font-medium">Known timestamp offset (optional)</label>
        <select id={offsetId} value={offset} onChange={(event) => setOffset(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Unknown — keep unzoned timestamps null</option>
          <option value="+01:00">Explicit +01:00 offset</option>
          <option value="Z">Explicit UTC (Z)</option>
        </select>
        <p className="text-xs text-slate-500">Choose an offset only if you know it applies to the conversation. No timezone is inferred.</p>
      </div>

      <ConversationImporter
        onImport={(result) => setPayload(result)}
        timestampOffset={offset || undefined}
        submitLabel="Preview parsed JSON"
        inputDisclosure="Test mode: submitted text stays in this browser. No AI request is made. Use fictional input for testing."
      />

      <section aria-label="Parsed JSON output" className="mt-10 border-t border-slate-200 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Submitted payload snapshot</h2>
          {payload && <button type="button" onClick={() => setPayload(null)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">Clear JSON output</button>}
        </div>
        <p className="mt-2 text-sm text-slate-600">This is the last submitted preview. Edit input and click Preview parsed JSON again to refresh it.</p>
        {payload ? (
          <>
            <p role="status" className="mt-3 text-sm text-indigo-700">Parsed {payload.messages.length} messages · Current user: {payload.currentUserLabel}{payload.referenceDate ? ` · Reference date: ${payload.referenceDate}` : ""}</p>
            <pre data-testid="parsed-output" className="mt-4 max-h-[32rem] overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-6 text-slate-100">{JSON.stringify(payload, null, 2)}</pre>
          </>
        ) : <p className="mt-4 text-sm text-slate-500">Submit a conversation to inspect its structured Message[] payload.</p>}
      </section>
    </main>
  );
}
