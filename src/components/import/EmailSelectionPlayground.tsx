"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { analyseEmailList, type EmailAnalysis } from "../../lib/conversation/analyseEmailList";
import { EMAIL_BLOCK_EXAMPLE, MAX_EMAIL_LIST_BYTES, SAMPLE_EMAIL_LIST, filterEmailList, parseEmailList, selectedVisibleEmails, type EmailRecord } from "../../lib/conversation/emailList";

interface Snapshot {
  emails: EmailRecord[];
  analyses: EmailAnalysis[];
  signature: string;
  action: "auto" | "selected";
}
const directionLabel = { you_owe: "You owe", they_owe: "They owe you", unknown: "Third party / unclear" };

export function EmailSelectionPlayground() {
  const id = useId();
  const [raw, setRaw] = useState("");
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const [sender, setSender] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentUser, setCurrentUser] = useState("");
  const [referenceDate, setReferenceDate] = useState("");
  const [busy, setBusy] = useState<"reading" | "auto" | "selected" | null>(null);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Snapshot | null>(null);
  const controller = useRef<AbortController | null>(null);
  const operation = useRef(0);
  useEffect(() => () => { operation.current += 1; controller.current?.abort(); }, []);

  const filters = { query, sender, fromDate, toDate };
  const visible = filterEmailList(emails, filters);
  const chosen = selectedVisibleEmails(emails, filters, selected);
  const signature = JSON.stringify([version, query, sender, fromDate, toDate, currentUser, referenceDate]);
  const scopeChanged = result?.action === "selected" && JSON.stringify(result.emails.map(email => email.id).sort()) !== JSON.stringify(chosen.map(email => email.id).sort());
  const stale = result && (result.signature !== signature || scopeChanged);
  const failed = result?.analyses.filter(item => item.error !== null) ?? [];
  const relevant = result?.analyses.filter(item => item.error === null && item.commitments.length > 0) ?? [];
  const commitments = result?.analyses.flatMap(item => item.commitments) ?? [];

  function replaceList(next: EmailRecord[]) {
    setEmails(next);
    setVersion(value => value + 1);
    setSelected(new Set());
    setQuery(""); setSender(""); setFromDate(""); setToDate("");
    setResult(null); setError(null);
  }
  function importList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try { replaceList(parseEmailList(raw)); } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to import this list.");
    }
  }
  function loadSample() {
    setRaw(JSON.stringify(SAMPLE_EMAIL_LIST, null, 2));
    replaceList(SAMPLE_EMAIL_LIST.map(email => ({ ...email, to: [...email.to] })));
    setCurrentUser("Me"); setReferenceDate("");
  }
  function clear() {
    operation.current += 1;
    controller.current?.abort(); controller.current = null;
    setBusy(null); setProgress(""); setRaw(""); setCurrentUser(""); setReferenceDate("");
    replaceList([]);
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const token = ++operation.current;
    setBusy("reading"); setError(null);
    try {
      if (!/\.(txt|json)$/i.test(file.name) || file.size > MAX_EMAIL_LIST_BYTES) throw new Error("Choose a UTF-8 .txt or .json email list up to 1 MiB.");
      const text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      if (text.includes("\0")) throw new Error("Binary files are not supported.");
      const next = parseEmailList(text);
      if (token !== operation.current) return;
      setRaw(text); replaceList(next);
    } catch (cause) {
      if (token === operation.current) setError(cause instanceof Error ? cause.message : "The file could not be read as UTF-8.");
    } finally { if (token === operation.current) setBusy(null); }
  }
  function toggle(emailId: string) {
    setSelected(previous => {
      const next = new Set(previous);
      if (next.has(emailId)) next.delete(emailId); else next.add(emailId);
      return next;
    });
  }
  async function analyse(action: "auto" | "selected") {
    if (busy) return;
    const scope = action === "auto" ? visible : chosen;
    const token = ++operation.current;
    const active = new AbortController();
    controller.current = active;
    setBusy(action); setError(null); setProgress(`0 / ${scope.length} emails analysed`);
    try {
      if (fromDate && toDate && fromDate > toDate) throw new Error("The start date must not be after the end date.");
      const analyses = await analyseEmailList(scope, {
        currentUserLabel: currentUser,
        ...(referenceDate ? { referenceDate } : {}),
        signal: active.signal,
        onProgress: (done, total) => { if (token === operation.current) setProgress(`${done} / ${total} emails analysed`); },
      });
      if (token !== operation.current) return;
      setResult({ emails: scope, analyses, signature, action });
      if (action === "auto") {
        const scopeIds = new Set(scope.map(email => email.id));
        setSelected(previous => {
          const next = new Set([...previous].filter(emailId => !scopeIds.has(emailId)));
          for (const item of analyses) {
            if (item.commitments.length > 0 || (item.error !== null && previous.has(item.emailId))) next.add(item.emailId);
          }
          return next;
        });
      }
    } catch (cause) {
      if (!active.signal.aborted && token === operation.current) setError(cause instanceof Error ? cause.message : "Email analysis failed.");
    } finally {
      if (token === operation.current) { setBusy(null); controller.current = null; }
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 text-slate-900 sm:px-8">
      <header className="mb-8 space-y-3 border-b border-slate-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-700">OpenLoop · Email selection test</p>
        <h1 className="text-3xl font-semibold tracking-tight">Pick the emails. Find what matters.</h1>
        <p className="max-w-3xl text-slate-600">Import a list, filter it locally, then select emails yourself or let real AI select emails containing definite commitments. Every result links back to its source email.</p>
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900"><strong>Review before AI processing.</strong> AI-select sends all currently visible emails; Analyse selected sends only selected visible emails. Text goes to this server and its configured model provider. Search/filtering is local. No Gmail connection, storage or automatic messaging. Use fictional data. AI relevance means commitments—not every important email.</p>
        <a href="/dev/commitment-test" className="text-sm font-medium text-indigo-700 underline underline-offset-4">Single-text commitment test</a>
      </header>
      <section className="mb-8 space-y-4 rounded-xl border border-slate-200 bg-white p-5" aria-label="Import email list">
        <h2 className="text-lg font-semibold">1. Load your email list</h2>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={!!busy} onClick={loadSample} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Try sample email list</button>
          <label htmlFor={`${id}-file`} className="text-sm font-medium">Upload .txt / .json</label>
          <input id={`${id}-file`} type="file" accept=".txt,.json,text/plain,application/json" disabled={!!busy} onChange={upload} className="max-w-full text-sm" />
          <button type="button" onClick={clear} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">{busy ? "Cancel and clear" : "Clear list"}</button>
        </div>
        <details open={emails.length === 0}>
          <summary className="cursor-pointer text-sm font-medium">Paste a structured list or inspect its format</summary>
          <form onSubmit={importList} className="mt-3 space-y-3">
            <label htmlFor={`${id}-raw`} className="block text-sm">JSON email array or blocks separated by ===EMAIL===</label>
            <textarea id={`${id}-raw`} value={raw} disabled={!!busy} onChange={event => setRaw(event.target.value)} rows={7} maxLength={MAX_EMAIL_LIST_BYTES} placeholder={EMAIL_BLOCK_EXAMPLE} className="w-full rounded-lg border border-slate-300 p-3 font-mono text-xs leading-5" />
            <p className="text-xs leading-5 text-slate-500">JSON fields: from, body, optional id/to/subject/sentAt. A date must include its known timezone, such as 2026-10-08T10:00:00Z; leave it blank if unknown. Up to 100 emails and 100,000 combined characters. These are manually supplied email records, not a live inbox.</p>
            <button type="submit" disabled={!!busy || !raw.trim()} className="rounded-lg border border-indigo-300 px-4 py-2 text-sm font-medium text-indigo-700">Import pasted list</button>
          </form>
        </details>
      </section>
      {error && <p role="alert" className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {emails.length > 0 && <>
        <section aria-label="Email filters and selection" className="space-y-4">
          <h2 className="text-lg font-semibold">2. Filter and choose emails</h2>
          <div className="flex flex-wrap gap-3">
            <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-medium">Search subject, body or people<input placeholder="Search emails" value={query} disabled={!!busy} onChange={event => setQuery(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            <label className="flex flex-col gap-1 text-xs font-medium">Sender<select value={sender} disabled={!!busy} onChange={event => setSender(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"><option value="">All senders</option>{[...new Set(emails.map(email => email.from))].sort().map(name => <option key={name} value={name}>{name}</option>)}</select></label>
            <label className="flex flex-col gap-1 text-xs font-medium">From date<input type="date" value={fromDate} disabled={!!busy} onChange={event => setFromDate(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
            <label className="flex flex-col gap-1 text-xs font-medium">To date<input type="date" value={toDate} disabled={!!busy} onChange={event => setToDate(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
          </div>
          <p className="text-xs text-slate-500">Date filters exclude emails with unknown dates. Filters do not send any data to AI.</p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <p>{visible.length} / {emails.length} visible · {chosen.length} selected visible · {selected.size} selected overall</p>
            <button type="button" disabled={!!busy} onClick={() => setSelected(previous => new Set([...previous, ...visible.map(email => email.id)]))} className="underline underline-offset-4">Select visible</button>
            <button type="button" disabled={!!busy} onClick={() => setSelected(previous => new Set([...previous].filter(emailId => !visible.some(email => email.id === emailId))))} className="underline underline-offset-4">Deselect visible</button>
            <button type="button" disabled={!!busy} onClick={() => { setQuery(""); setSender(""); setFromDate(""); setToDate(""); }} className="underline underline-offset-4">Reset filters</button>
          </div>
          <div className="max-h-[32rem] space-y-3 overflow-auto">
            {visible.length === 0 && <p className="rounded-lg bg-slate-50 p-4 text-sm">No emails match these filters.</p>}
            {visible.map(email => {
              const analysis = !stale ? result?.analyses.find(item => item.emailId === email.id) : undefined;
              return <article key={email.id} data-testid={`email-${email.id}`} className="rounded-lg border border-slate-200 bg-white p-4">
                <label className="flex items-start gap-3"><input type="checkbox" disabled={!!busy} checked={selected.has(email.id)} onChange={() => toggle(email.id)} className="mt-1" aria-label={`Select ${email.subject || email.id}`} /><span className="flex-1"><strong className="block text-sm">{email.subject || "(no subject)"}</strong><span className="mt-1 block text-xs text-slate-500">{email.from} → {email.to.join(", ") || "Unknown recipient"} · {email.sentAt ?? "Date unknown"}</span></span></label>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{email.body.slice(0, 260)}{email.body.length > 260 ? "…" : ""}</p>
                <details className="mt-2 text-xs"><summary className="cursor-pointer text-indigo-700">Inspect full email · {email.id}</summary><p className="mt-2 whitespace-pre-wrap break-words leading-6">{email.body}</p></details>
                {analysis && <p className={`mt-3 text-xs font-medium ${analysis.error ? "text-red-700" : "text-indigo-700"}`}>{analysis.error ? "Analysis failed — relevance unknown" : analysis.commitments.length ? `${analysis.commitments.length} commitment(s) found` : "No definite commitments found"}</p>}
              </article>;
            })}
          </div>
        </section>
        <section aria-label="Analyse selected emails" className="mt-8 space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-5">
          <h2 className="text-lg font-semibold">3. Find relevant emails and extract data</h2>
          <div className="flex flex-wrap gap-4">
            <label className="flex flex-1 flex-col gap-1 text-sm font-medium">Your name / email label<input value={currentUser} disabled={!!busy} onChange={event => setCurrentUser(event.target.value)} placeholder="e.g. Me" maxLength={80} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" /></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Reference date, if known<input type="date" value={referenceDate} disabled={!!busy} onChange={event => setReferenceDate(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" /></label>
          </div>
          <p className="text-xs leading-5 text-slate-600">AI-select checks all visible emails and ticks those containing commitments. Manual analysis sends selected visible emails only—hidden selections are never sent. Up to 10 emails per action, two at a time; each is analysed independently. Relative dates use its timestamp or your explicit reference date, never today by default.</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={!!busy || !visible.length || !currentUser.trim()} onClick={() => analyse("auto")} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">AI-select relevant emails ({visible.length})</button>
            <button type="button" disabled={!!busy || !chosen.length || !currentUser.trim()} onClick={() => analyse("selected")} className="rounded-lg border border-indigo-300 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 disabled:opacity-40">Analyse selected visible ({chosen.length})</button>
            {busy && <button type="button" onClick={clear} className="text-sm underline">Cancel and clear</button>}
          </div>
          {busy && <p role="status" className="text-sm text-indigo-700">{busy === "reading" ? "Reading local file…" : progress}</p>}
        </section>
      </>}
      {result && <section aria-label="Email commitment results" className="mt-8 space-y-4 border-t border-slate-200 pt-6">
        <h2 className="text-lg font-semibold">4. Extracted data, linked to its email</h2>
        {stale && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Filters, selection or identity changed. These are the previous results; run analysis again for the current scope.</p>}
        <p role="status" className="text-sm text-indigo-700">{relevant.length} emails with commitments · {commitments.length} commitments · {result.analyses.length - failed.length} successfully analysed · {failed.length} failed</p>
        {result.action === "auto" && <p className="text-xs text-slate-500">Emails with commitments were selected automatically. A failed email is not classified as irrelevant; review or retry it.</p>}
        {commitments.length === 0 && failed.length === 0 && <p className="text-sm text-slate-600">No definite commitments were found in this analysed scope. No sample data has been substituted.</p>}
        {result.analyses.map(item => {
          const email = result.emails.find(record => record.id === item.emailId)!;
          if (!item.error && !item.commitments.length) return null;
          return <article key={item.emailId} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="font-semibold">{email.subject || "(no subject)"}</h3>
            <p className="text-xs text-slate-500">Original email: {email.id} · From {email.from}</p>
            {item.error && <p role="alert" className="text-sm text-red-700">Not analysed: {item.error}</p>}
            {item.commitments.map((commitment, index) => <div key={`${commitment.id}-${index}`} className="space-y-2 border-l-2 border-indigo-300 pl-4">
              <p className="text-xs font-semibold text-indigo-700">{directionLabel[commitment.direction]}</p>
              <h4 className="text-sm font-semibold">{commitment.title}</h4>
              <p className="text-sm">{commitment.promisor} → {commitment.beneficiary ?? "Unknown recipient"} · Due: {commitment.dueAt ?? "Unknown"}</p>
              <blockquote className="whitespace-pre-wrap text-sm italic text-slate-600">{commitment.evidenceQuote}</blockquote>
              <p className="text-xs text-slate-500">Confidence: {commitment.confidence} · Source email: {commitment.sourceMessageId}</p>
            </div>)}
          </article>;
        })}
        <details><summary className="cursor-pointer text-sm font-medium">Structured JSON output</summary><pre data-testid="email-analysis-output" className="mt-3 max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-6 text-slate-100">{JSON.stringify({ analysedEmailIds: result.emails.map(email => email.id), results: result.analyses }, null, 2)}</pre></details>
      </section>}
    </main>
  );
}
