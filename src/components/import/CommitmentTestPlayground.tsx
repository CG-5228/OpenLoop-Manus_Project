"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { MAX_CONVERSATION_CHARACTERS, parseTextInput, SAMPLE_CONVERSATION, SAMPLE_CURRENT_USER, SAMPLE_REFERENCE_DATE, type TextInputMode } from "../../lib/conversation";
import { requestCommitments } from "../../lib/conversation/requestCommitments";
import type { Commitment, Message } from "../../types/openloop";

interface Result {
  commitments: Commitment[];
  messages: Message[];
  inputKey: string;
}

const directionLabel = { you_owe: "You owe", they_owe: "They owe you", unknown: "Direction unclear / third party" };

export function CommitmentTestPlayground() {
  const id = useId();
  const [text, setText] = useState("");
  const [mode, setMode] = useState<TextInputMode>("labelled-chat");
  const [author, setAuthor] = useState("");
  const [currentUser, setCurrentUser] = useState("");
  const [referenceDate, setReferenceDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => { controller.current?.abort(); }, []);
  const inputKey = JSON.stringify([text, mode, author, currentUser, referenceDate]);

  function sample() {
    setText(SAMPLE_CONVERSATION);
    setMode("labelled-chat");
    setAuthor("");
    setCurrentUser(SAMPLE_CURRENT_USER);
    setReferenceDate(SAMPLE_REFERENCE_DATE);
    setError(null);
  }

  function clear() {
    controller.current?.abort();
    controller.current = null;
    setBusy(false);
    setText("");
    setAuthor("");
    setCurrentUser("");
    setReferenceDate("");
    setResult(null);
    setError(null);
  }

  async function analyse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    const active = new AbortController();
    controller.current = active;
    setBusy(true);
    try {
      const messages = parseTextInput({ text, mode, knownAuthor: author });
      if (!messages.length) throw new Error("Enter some text before analysis.");
      if (!currentUser.trim()) throw new Error("Enter your name or chat label so the direction can be determined.");
      const commitments = await requestCommitments({ messages, currentUserLabel: currentUser.trim(), ...(referenceDate ? { referenceDate } : {}) }, active.signal);
      if (controller.current === active) setResult({ commitments, messages, inputKey });
    } catch (cause) {
      if (!active.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to analyse this text.");
    } finally {
      if (controller.current === active) { setBusy(false); controller.current = null; }
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 text-slate-900 sm:px-8">
      <header className="mb-8 space-y-3 border-b border-slate-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-700">OpenLoop · Live AI test</p>
        <h1 className="text-3xl font-semibold tracking-tight">Paste text. Find the commitments.</h1>
        <p className="max-w-3xl text-slate-600">Enter a conversation or email body and see who promised what, to whom, and when—with the original words as evidence.</p>
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900"><strong>Real AI processing.</strong> Clicking Find commitments sends your text to this test server and its configured AI provider. Use fictional text. This page does not save conversations, connect to Gmail or send messages. AI can misinterpret commitments; review the evidence. This is a temporary integration test, not the completed product.</p>
        <a href="/dev/text-parser" className="text-sm font-medium text-indigo-700 underline underline-offset-4">Parser-only test: no AI request</a>
      </header>
      <div className="flex flex-col items-start gap-8 lg:flex-row">
        <form onSubmit={analyse} className="w-full space-y-4 lg:w-1/2">
          <h2 className="text-lg font-semibold">1. Your input</h2>
          <div>
            <label htmlFor={`${id}-mode`} className="mb-2 block text-sm font-medium">Input format</label>
            <select id={`${id}-mode`} disabled={busy} value={mode} onChange={event => setMode(event.target.value as TextInputMode)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="labelled-chat">Labelled chat — James: message</option>
              <option value="whole-block">Whole email / text block — one known or unknown author</option>
            </select>
            <p className="mt-2 text-xs text-slate-500">For multiple senders use Name: message on each new message. Whole-block mode does not reconstruct Gmail threads or guess their authors.</p>
          </div>
          <div>
            <label htmlFor={`${id}-text`} className="mb-2 block text-sm font-medium">Text to analyse</label>
            <textarea id={`${id}-text`} disabled={busy} value={text} onChange={event => setText(event.target.value)} rows={10} maxLength={MAX_CONVERSATION_CHARACTERS} placeholder="James: I'll email you the report tomorrow.\nMe: Thanks!" className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            <p className="mt-1 text-xs text-slate-500">{text.length.toLocaleString()} / 100,000 characters</p>
          </div>
          <div>
            <label htmlFor={`${id}-user`} className="mb-2 block text-sm font-medium">Which name or label is you?</label>
            <input id={`${id}-user`} required disabled={busy} value={currentUser} onChange={event => setCurrentUser(event.target.value)} maxLength={80} placeholder="e.g. Me or Sarah" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <p className="mt-1 text-xs text-slate-500">Your identity is explicit—not guessed. It can be the named recipient of an email.</p>
          </div>
          {mode === "whole-block" && <div>
            <label htmlFor={`${id}-author`} className="mb-2 block text-sm font-medium">Known author of this block (optional)</label>
            <input id={`${id}-author`} disabled={busy} value={author} onChange={event => setAuthor(event.target.value)} maxLength={80} placeholder="e.g. James — leave blank if unknown" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>}
          <div>
            <label htmlFor={`${id}-date`} className="mb-2 block text-sm font-medium">Conversation date (optional)</label>
            <input id={`${id}-date`} type="date" disabled={busy} value={referenceDate} onChange={event => setReferenceDate(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <p className="mt-1 text-xs text-slate-500">Only enter a date you know. Relative deadlines stay unknown without a dated source or reference date.</p>
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy || !text.trim() || !currentUser.trim()} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40">{busy ? "Finding commitments…" : "Find commitments"}</button>
            <button type="button" disabled={busy} onClick={sample} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm">Try fictional sample</button>
            <button type="button" onClick={clear} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm">{busy ? "Cancel and clear" : "Clear"}</button>
          </div>
        </form>
        <section aria-label="AI commitment output" className="w-full space-y-4 rounded-xl border border-slate-200 bg-white p-5 lg:w-1/2">
          <h2 className="text-lg font-semibold">2. AI output</h2>
          {busy && <p role="status" className="text-sm text-indigo-700">Analysing with the real model. This can take up to about a minute.</p>}
          {!result && !busy && <p className="text-sm leading-6 text-slate-500">Paste text or try the sample, identify yourself, then click Find commitments. Results and JSON appear here.</p>}
          {result && <>
            {result.inputKey !== inputKey && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Input changed. Run Find commitments again to refresh these results.</p>}
            <p role="status" className="text-sm font-medium text-indigo-700">{result.commitments.length} commitment{result.commitments.length === 1 ? "" : "s"} found</p>
            {result.commitments.length === 0 && <p className="text-sm text-slate-600">The model found no definite commitments in this input. It has not replaced them with sample results.</p>}
            <ol className="space-y-3">
              {result.commitments.map(item => <li key={item.id} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">{directionLabel[item.direction]}</p>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.promisor} → {item.beneficiary ?? "Recipient unknown"}</p>
                <p className="text-xs text-slate-500">Due: {item.dueAt ?? "Unknown"} · Confidence: {item.confidence}</p>
                <blockquote className="border-l-2 border-indigo-300 pl-3 text-sm italic leading-6">{item.evidenceQuote}</blockquote>
                <p className="break-all text-xs text-slate-500">Source message: {item.sourceMessageId}</p>
              </li>)}
            </ol>
            <details>
              <summary className="cursor-pointer text-sm font-semibold">Structured output JSON</summary>
              <pre data-testid="commitment-output" className="mt-3 max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-6 text-slate-100">{JSON.stringify({ commitments: result.commitments }, null, 2)}</pre>
            </details>
            <details>
              <summary className="cursor-pointer text-sm font-semibold">Parsed source messages sent to AI</summary>
              <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-6 text-slate-100">{JSON.stringify(result.messages, null, 2)}</pre>
            </details>
          </>}
        </section>
      </div>
    </main>
  );
}
