"use client";

/**
 * Module D test harness (client). Uses ONLY the public hooks/functions that
 * the dashboard will use (`@/hooks/useCommitments`), so it doubles as a live
 * usage example of the team contract: addCommitments, updateCommitment,
 * dismissCommitment.
 * Styling is intentionally plain — this is not the product UI.
 */

import { useEffect, useState } from "react";
import {
  CONFIDENCE_LABELS,
  DIRECTION_LABELS,
  STATUS_LABELS,
  toDateTimeLocalValue,
  type Commitment,
  type DirectionFilter,
  type DisplayStatus,
  type FollowUpTone,
  type StatusFilter,
} from "@/lib/commitments";
import {
  commitmentContract,
  useCommitment,
  useCommitments,
  useCommitmentsError,
  useFollowUp,
} from "@/hooks/useCommitments";
import {
  createDemoCommitments,
  createDemoMessages,
  createDemoSuggestion,
  createDuplicateImport,
} from "@/lib/commitments/__fixtures__/demo";

const CURRENT_USER = "Me";

const STATUS_STYLES: Record<DisplayStatus, string> = {
  pending: "bg-sky-50 text-sky-700 ring-sky-200",
  overdue: "bg-rose-50 text-rose-700 ring-rose-200",
  needs_review: "bg-amber-50 text-amber-800 ring-amber-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  dismissed: "bg-zinc-100 text-zinc-500 ring-zinc-200",
};

function Badge({ status }: { status: DisplayStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function Button({
  children,
  variant = "secondary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  const styles = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-700 disabled:bg-zinc-400",
    secondary: "bg-white text-zinc-800 ring-1 ring-zinc-300 hover:bg-zinc-50 disabled:text-zinc-400",
    ghost: "text-zinc-600 hover:bg-zinc-100 disabled:text-zinc-300",
  }[variant];
  return (
    <button
      type="button"
      {...props}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-1 ${styles} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

function FollowUpPanel({ commitment }: { commitment: Commitment }) {
  const [tone, setTone] = useState<FollowUpTone>("casual");
  // The harness labels template drafts, so it may opt in to them.
  const f = useFollowUp(commitment, { currentUserLabel: CURRENT_USER, tone, allowTemplate: true });

  if (f.status === "idle") {
    return (
      <div className="flex items-center gap-2">
        <select
          aria-label="Follow-up tone"
          value={tone}
          onChange={(e) => setTone(e.target.value as FollowUpTone)}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
        >
          <option value="casual">Casual</option>
          <option value="polite">Polite</option>
          <option value="firm">Firm</option>
        </select>
        <Button onClick={() => f.generate()} data-testid="generate-followup">
          Generate follow-up
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3" data-testid="followup-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-medium text-zinc-700">Follow-up draft — review before sending</span>
        {f.source && (
          <span
            data-testid="followup-source"
            className={`rounded-full px-2 py-0.5 font-medium ${
              f.source === "ai" ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-800"
            }`}
          >
            {f.source === "ai" ? `AI draft · ${f.model}` : "Template (not AI)"}
          </span>
        )}
      </div>
      {f.isLoading && <p className="text-sm text-zinc-500">Drafting a follow-up…</p>}
      {f.error && (
        <p role="alert" className="text-sm text-rose-700">
          {f.error}
        </p>
      )}
      {f.notice && <p className="text-xs text-amber-800">{f.notice}</p>}
      {(f.status === "ready" || (f.isLoading && f.draft)) && (
        <textarea
          aria-label="Follow-up message"
          data-testid="followup-text"
          value={f.draft}
          onChange={(e) => f.setDraft(e.target.value)}
          rows={3}
          className="w-full resize-y rounded-md border border-zinc-300 bg-white p-2 text-sm"
        />
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => f.copy()} disabled={!f.draft || f.isLoading} data-testid="copy-followup">
          {f.copied ? "Copied" : "Copy message"}
        </Button>
        <Button onClick={() => f.generate()} disabled={f.isLoading}>
          Regenerate
        </Button>
        <Button variant="ghost" onClick={f.reset}>
          Close
        </Button>
      </div>
    </div>
  );
}

function DeadlineEditor({ commitment }: { commitment: Commitment }) {
  const { updateCommitment } = commitmentContract;
  const error = useCommitmentsError();
  const [value, setValue] = useState(() => toDateTimeLocalValue(commitment.dueAt));
  const [failed, setFailed] = useState(false);

  // Contract function: returns null (and sets the shared `error`) on failure.
  const save = (next: string | null) => setFailed(updateCommitment(commitment.id, { dueAt: next }) === null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-xs text-zinc-500" htmlFor={`due-${commitment.id}`}>
        Deadline
      </label>
      <input
        id={`due-${commitment.id}`}
        type="datetime-local"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm"
      />
      <Button onClick={() => save(value || null)} disabled={value === toDateTimeLocalValue(commitment.dueAt)}>
        Save
      </Button>
      {commitment.dueAt && (
        <Button variant="ghost" onClick={() => save(null)}>
          Clear
        </Button>
      )}
      {failed && error && <span className="text-xs text-rose-700">{error}</span>}
    </div>
  );
}

function CommitmentRow({ commitment }: { commitment: Commitment }) {
  const d = useCommitment(commitment.id);
  const { updateCommitment, dismissCommitment, getMessage } = commitmentContract;
  if (!d.commitment || !d.displayStatus || !d.actions) return null;
  const c = d.commitment;
  const source = getMessage(c.sourceMessageId);
  const open = c.status === "pending";

  return (
    <li className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid={`row-${c.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-zinc-900">{c.title}</h3>
          <p className="text-sm text-zinc-600">
            {DIRECTION_LABELS[c.direction]} · {c.promisor} → {c.beneficiary ?? "—"} ·{" "}
            <span className={d.isOverdue ? "font-medium text-rose-700" : ""}>{d.deadlineLabel}</span>
            {d.deadlineFormatted && <span className="text-zinc-400"> ({d.deadlineFormatted})</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">{CONFIDENCE_LABELS[c.confidence]}</span>
          <Badge status={d.displayStatus} />
        </div>
      </div>

      <blockquote className="border-l-2 border-zinc-300 pl-3 text-sm italic text-zinc-700">
        “{c.evidenceQuote}”
        {source && (
          <span className="mt-1 block text-xs not-italic text-zinc-500" data-testid="evidence-source">
            — {source.sender}
            {source.sentAt ? `, ${new Date(source.sentAt).toLocaleString("en-GB")}` : ""}
          </span>
        )}
      </blockquote>

      {d.suggestions.map((s) => (
        <div key={s.sourceMessageId} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="font-medium text-amber-900">{c.promisor} may have completed this commitment.</p>
          <p className="mt-1 italic text-amber-900">“{s.evidenceQuote}”</p>
          <p className="mt-1 text-xs text-amber-800">
            {s.reason} ({s.confidence} confidence)
          </p>
          <div className="mt-2 flex gap-2">
            <Button variant="primary" onClick={() => d.actions!.acceptSuggestion(s.sourceMessageId)}>
              Confirm completed
            </Button>
            <Button onClick={() => d.actions!.rejectSuggestion(s.sourceMessageId)}>Not yet</Button>
          </div>
        </div>
      ))}

      {d.record?.completion && (
        <p className="text-xs text-emerald-700">
          Completion evidence: “{d.record.completion.evidenceQuote}”
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {open ? (
          <>
            <Button
              variant="primary"
              onClick={() => updateCommitment(c.id, { status: "completed" })}
              data-testid="complete"
            >
              Mark completed
            </Button>
            <Button onClick={() => dismissCommitment(c.id)} data-testid="dismiss">
              Dismiss
            </Button>
          </>
        ) : (
          <Button onClick={() => updateCommitment(c.id, { status: "pending" })} data-testid="restore">
            Restore to pending
          </Button>
        )}
      </div>

      {/* key resets the input when the stored deadline changes */}
      {open && <DeadlineEditor key={c.dueAt ?? "none"} commitment={c} />}
      {open && <FollowUpPanel commitment={c} />}
    </li>
  );
}

export default function CommitmentsHarness() {
  const [direction, setDirection] = useState<DirectionFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [log, setLog] = useState<string>("");
  const [ai, setAi] = useState<{ aiConfigured: boolean; model: string | null } | null>(null);
  const {
    commitments,
    stats,
    addCommitments,
    saveSuggestions,
    clearAll,
    error,
    isHydrated,
    isEmpty,
    isPersistent,
    all,
  } = useCommitments({ direction, status, query });

  useEffect(() => {
    fetch("/api/follow-up")
      .then((r) => r.json())
      .then(setAi)
      .catch(() => setAi(null));
  }, []);

  const loadDemo = () => {
    const r = addCommitments(createDemoCommitments(), createDemoMessages());
    if (r) setLog(`Import: ${r.added.length} added, ${r.duplicates.length} duplicates skipped, ${r.rejected.length} rejected.`);
  };
  const reimport = () => {
    const r = addCommitments(createDuplicateImport());
    if (r) setLog(`Re-import: ${r.added.length} added, ${r.duplicates.length} duplicates skipped, ${r.updated.length} updated.`);
  };
  const suggest = () => {
    const james = all.find((c) => c.promisor === "James" && c.status === "pending");
    if (!james) return setLog("No pending James commitment to suggest completion for.");
    const r = saveSuggestions([createDemoSuggestion(james.id)]);
    if (r) setLog(`Suggestions: ${r.added.length} added, ${r.ignored.length} ignored.`);
  };

  const statCards: [string, number][] = [
    ["Open loops", stats.open],
    ["You owe", stats.youOwe],
    ["They owe you", stats.theyOwe],
    ["Overdue", stats.overdue],
    ["Needs review", stats.needsReview],
    ["Completed", stats.completed],
    ["Dismissed", stats.dismissed],
  ];

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <header className="space-y-2">
          <p className="inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-900">
            Dev harness · synthetic data · not the product UI
          </p>
          <h1 className="text-2xl font-semibold">Module D — Commitment Management</h1>
          <p className="text-sm text-zinc-600">
            Exercises storage, status actions, deadline editing, completion suggestions and follow-ups through the
            public hooks. Follow-ups are drafts only — nothing is ever sent.
          </p>
          <p className="text-xs text-zinc-500" data-testid="ai-status">
            Follow-up AI:{" "}
            {ai == null ? "checking…" : ai.aiConfigured ? `connected (${ai.model})` : "not configured — labelled template drafts only"}
          </p>
        </header>

        <section className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={loadDemo} data-testid="load-demo">
            Load demo commitments
          </Button>
          <Button onClick={reimport} data-testid="reimport">
            Simulate duplicate import
          </Button>
          <Button onClick={suggest} data-testid="suggest">
            Simulate completion suggestion
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              clearAll();
              setLog("Cleared all commitments.");
            }}
          >
            Clear all
          </Button>
        </section>
        {log && (
          <p className="text-sm text-zinc-700" role="status" data-testid="log">
            {log}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-rose-700" data-testid="store-error">
            {error}
          </p>
        )}
        {isHydrated && !isPersistent && (
          <p role="alert" className="text-sm text-amber-800">
            Browser storage is unavailable — changes will be lost when you close this tab.
          </p>
        )}

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7" data-testid="stats">
          {statCards.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-200 bg-white p-3">
              <p className="text-xs text-zinc-500">{label}</p>
              <p className="text-xl font-semibold tabular-nums">{isHydrated ? value : "–"}</p>
            </div>
          ))}
        </section>

        <section className="flex flex-wrap gap-2">
          <select
            aria-label="Direction"
            value={direction}
            onChange={(e) => setDirection(e.target.value as DirectionFilter)}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
          >
            <option value="all">All directions</option>
            <option value="you_owe">You owe</option>
            <option value="they_owe">They owe you</option>
            <option value="unknown">Unclear</option>
          </select>
          <select
            aria-label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="needs_review">Needs review</option>
            <option value="completed">Completed</option>
            <option value="dismissed">Dismissed</option>
          </select>
          <input
            type="search"
            aria-label="Search commitments"
            placeholder="Search title, people, evidence…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-[14rem] flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm"
          />
        </section>

        {!isHydrated ? (
          <p className="text-sm text-zinc-500">Loading saved commitments…</p>
        ) : isEmpty ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            No commitments stored yet. Load the demo data to start.
          </p>
        ) : commitments.length === 0 ? (
          <p className="text-sm text-zinc-500">No commitments match these filters.</p>
        ) : (
          <ul className="space-y-3" data-testid="list">
            {commitments.map((c) => (
              <CommitmentRow key={c.id} commitment={c} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
