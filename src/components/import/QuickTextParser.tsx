"use client";

import { useId, useState, type FormEvent } from "react";
import { MAX_CONVERSATION_CHARACTERS, parseTextInput, type TextInputMode } from "../../lib/conversation";
import type { Message } from "../../types/openloop";
import { MessagePreview } from "./MessagePreview";

interface OutputSnapshot {
  messages: Message[];
  text: string;
  mode: TextInputMode;
  knownAuthor: string;
}

const BLOCK_SAMPLE = "Subject: Project update\n\nHi team,\nI'll email the final report tomorrow. James will send the slides on Friday. We also discussed the weekend, but no action was agreed.\n\nThanks!";
const CHAT_SAMPLE = "James: Hi, how was your weekend?\nMe: Good! Could you send the report?\nJames: Yes, I'll email it tomorrow.\nSarah: I might review it later.";

export function QuickTextParser() {
  const id = useId();
  const [text, setText] = useState("");
  const [mode, setMode] = useState<TextInputMode>("whole-block");
  const [knownAuthor, setKnownAuthor] = useState("");
  const [output, setOutput] = useState<OutputSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const stale = output && (output.text !== text || output.mode !== mode || output.knownAuthor !== knownAuthor);

  function parse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCopied(false);
    try {
      const messages = parseTextInput({ text, mode, knownAuthor });
      if (messages.length === 0) {
        setError("Enter some message text before parsing.");
        return;
      }
      setOutput({ messages, text, mode, knownAuthor });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to parse this text.");
    }
  }

  async function copyOutput() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(output.messages, null, 2));
      setCopied(true);
    } catch {
      setError("Copy is unavailable here. Select and copy the JSON below instead.");
    }
  }

  function clear() {
    setText("");
    setKnownAuthor("");
    setOutput(null);
    setError(null);
    setCopied(false);
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 text-slate-900 sm:px-8">
      <header className="mb-8 space-y-3 border-b border-slate-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-700">OpenLoop · Text parser test</p>
        <h1 className="text-3xl font-semibold tracking-tight">Enter text. Inspect the output.</h1>
        <p className="max-w-3xl text-slate-600">Paste an email, a paragraph or a labelled chat. Click Parse text to see the actual structured message output. No sender selection is required.</p>
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900"><strong>Format parsing, not meaningful-promise extraction.</strong> This does not detect commitments, resolve deadlines or remove small talk. No AI request, Gmail-account access, screenshot OCR or message storage. Your input stays in this browser.</p>
        <a className="inline-block text-sm font-medium text-indigo-700 underline underline-offset-4" href="/dev/conversation">Advanced importer: files, date context and timestamp offsets</a>
      </header>

      <div className="flex flex-col items-start gap-8 lg:flex-row">
        <form onSubmit={parse} className="w-full space-y-5 lg:w-1/2">
          <h2 className="text-lg font-semibold">1. Enter your text</h2>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">How should this text be read?</legend>
            <label className="flex gap-2 text-sm"><input type="radio" name={`${id}-mode`} checked={mode === "whole-block"} onChange={() => { setMode("whole-block"); setCopied(false); }} />Whole block — preserve email/page text as one message</label>
            <label className="flex gap-2 text-sm"><input type="radio" name={`${id}-mode`} checked={mode === "labelled-chat"} onChange={() => { setMode("labelled-chat"); setCopied(false); }} />Labelled chat — split lines such as James: message</label>
          </fieldset>
          <div className="space-y-2">
            <label htmlFor={`${id}-text`} className="block text-sm font-medium">Text to parse</label>
            <textarea id={`${id}-text`} value={text} onChange={event => { setText(event.target.value); setError(null); setCopied(false); }} maxLength={MAX_CONVERSATION_CHARACTERS} rows={12} placeholder="Paste your email or message text here…" className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm leading-6 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            <p className="text-xs text-slate-500">{text.length.toLocaleString()} / 100,000 characters. Whole-block mode preserves headers and paragraphs without guessing their meaning.</p>
          </div>
          <div className="space-y-2">
            <label htmlFor={`${id}-author`} className="block text-sm font-medium">Known author (optional)</label>
            <input id={`${id}-author`} value={knownAuthor} onChange={event => { setKnownAuthor(event.target.value); setCopied(false); }} maxLength={80} placeholder="Leave blank if unknown" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <p className="text-xs text-slate-500">Only supply an author you know. In labelled-chat mode, this is used only for unattributed content.</p>
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={!text.trim()} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">Parse text</button>
            <button type="button" onClick={() => { setText(mode === "whole-block" ? BLOCK_SAMPLE : CHAT_SAMPLE); setKnownAuthor(""); setError(null); setCopied(false); }} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm">Load fictional example</button>
            <button type="button" onClick={clear} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm">Clear</button>
          </div>
        </form>

        <section aria-label="Text parsing output" className="w-full space-y-4 rounded-xl border border-slate-200 bg-white p-5 lg:w-1/2">
          <h2 className="text-lg font-semibold">2. Your parsed output</h2>
          {!output ? <p className="text-sm leading-6 text-slate-500">Enter text on the left and click Parse text. The result will appear here. Nothing is submitted to AI.</p> : (
            <>
              <p role="status" className="text-sm text-indigo-700">{output.messages.length} message{output.messages.length === 1 ? "" : "s"} · {new Set(output.messages.map(message => message.sender)).size} sender label{new Set(output.messages.map(message => message.sender)).size === 1 ? "" : "s"}</p>
              {stale && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Input changed. Click Parse text again to refresh this output.</p>}
              <MessagePreview messages={output.messages} />
              <p className="text-xs leading-5 text-slate-500">Unknown sender or timestamp means the information was not supplied. This output is Message[] for downstream analysis, not extracted commitments.</p>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">Structured JSON</h3>
                <button type="button" onClick={copyOutput} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs">{copied ? "Copied" : "Copy JSON"}</button>
              </div>
              <pre data-testid="quick-parsed-output" className="max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-6 text-slate-100">{JSON.stringify(output.messages, null, 2)}</pre>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
