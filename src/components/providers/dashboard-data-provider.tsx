"use client";

/**
 * DashboardDataProvider — the single data seam for the dashboard UI.
 *
 * LIVE by default: `useLiveAdapter()` maps Member 4's `useCommitments()` hook
 * (browser persistence, src/lib/commitments) and `requestFollowUp()`
 * (POST /api/follow-up) onto `DashboardDataApi`, with `mode: "live"`.
 *
 * The clearly-labelled in-memory DEMO adapter over synthetic fixtures is kept
 * for QA only and is used when the URL has a `demo-state` parameter
 * (`?demo-state=demo` shows the synthetic dataset).
 *
 * QA helper: append `?demo-state=loading|empty|error` to any app URL to
 * preview the loading, empty and error states.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { Commitment, CompletionSuggestion, Message } from "@/types/openloop";
import type { DashboardDataApi, LoadState } from "@/lib/ui/dashboard-data-api";
import { createDemoDataset } from "@/lib/mock/demo-data";
import { formatDue } from "@/lib/ui/commitment-view";
import { requestFollowUp } from "@/lib/ui/api-client";
import { useCommitments } from "@/hooks/useCommitments";
import { toast } from "sonner";

const CommitmentsContext = createContext<DashboardDataApi | null>(null);

export function useDashboardData(): DashboardDataApi {
  const ctx = useContext(CommitmentsContext);
  if (!ctx) {
    throw new Error("useDashboardData must be used within <DashboardDataProvider>");
  }
  return ctx;
}

export function DashboardDataProvider({ children }: { children: React.ReactNode }) {
  const live = useLiveAdapter();
  const demo = useDemoAdapter();
  const api = useDemoQaMode() ? demo : live;
  return (
    <CommitmentsContext.Provider value={api}>{children}</CommitmentsContext.Provider>
  );
}

// ── Live adapter (Member 4: src/lib/commitments) ──────────────────────────

/** Show an honest error toast and abort the caller's success toast. */
function failAction(what: string, err: unknown): never {
  const description = err instanceof Error ? err.message : "Please try again.";
  toast.error(`Couldn't ${what}`, { description });
  throw err instanceof Error ? err : new Error(String(err));
}

function useLiveAdapter(): DashboardDataApi {
  const c = useCommitments();
  return useMemo<DashboardDataApi>(() => {
    const { actions } = c;
    // Raw store actions throw on failure (storage full, unknown id, bad date);
    // never let the UI report success for a change that wasn't saved.
    const act = (what: string, fn: () => unknown) => {
      try {
        fn();
      } catch (err) {
        failAction(what, err);
      }
    };
    return {
      mode: "live",
      state: c.state,
      error: c.error,
      commitments: c.commitments,
      suggestions: c.suggestions,
      getCommitment: c.getCommitment,
      getMessage: c.getMessage,
      reload: c.reload,
      addCommitments: (list, messages) =>
        act("save these commitments", () => {
          const result = actions.saveCommitments(list, messages);
          if (result.duplicates.length > 0) {
            toast(`${result.duplicates.length} already tracked`, {
              description: "Skipped duplicates from an earlier import.",
            });
          }
        }),
      markCompleted: (id) => act("mark this as completed", () => actions.updateCommitment(id, { status: "completed" })),
      restore: (id) => act("restore this commitment", () => actions.updateCommitment(id, { status: "pending" })),
      dismiss: (id) => act("dismiss this commitment", () => actions.updateCommitment(id, { status: "dismissed" })),
      updateDeadline: (id, dueAt) => act("update the deadline", () => actions.updateCommitment(id, { dueAt })),
      generateFollowUp: (commitment) => requestFollowUp(commitment),
      confirmSuggestion: (id) => act("confirm this suggestion", () => actions.acceptSuggestion(id)),
      rejectSuggestion: (id) => act("dismiss this suggestion", () => actions.rejectSuggestion(id)),
      clearAll: () => act("clear your commitments", () => actions.clearAll()),
    };
  }, [c]);
}

// QA switch: any `?demo-state=` URL parameter selects the demo adapter.
// Server snapshot is false, so hydration always matches; the switch applies
// right after hydration.
function subscribeToUrl(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

function useDemoQaMode(): boolean {
  return useSyncExternalStore(
    subscribeToUrl,
    () => readDemoState() !== null,
    () => false,
  );
}

// ── Demo adapter (placeholder) ─────────────────────────────────────────────

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function readDemoState(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("demo-state");
}

function useDemoAdapter(): DashboardDataApi {
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [suggestions, setSuggestions] = useState<CompletionSuggestion[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadKey, setLoadKey] = useState(0);
  // True once real (AI-extracted) results have been added. The first real import
  // replaces the synthetic fixtures so real results are never mixed with demo data.
  const [hasImported, setHasImported] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const forced = readDemoState();
    (async () => {
      setState("loading");
      setError(null);
      await wait(forced === "loading" ? 60_000 : 450);
      if (cancelled) return;
      if (forced === "error") {
        setError("Check your connection and try again. Your data hasn't been changed.");
        setState("error");
        return;
      }
      const data =
        forced === "empty"
          ? { commitments: [], suggestions: [], messages: [] }
          : createDemoDataset();
      setCommitments(data.commitments);
      setSuggestions(data.suggestions);
      setMessages(data.messages);
      setHasImported(false);
      setState("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [loadKey]);

  const patch = useCallback((id: string, change: Partial<Commitment>) => {
    setCommitments((list) => list.map((c) => (c.id === id ? { ...c, ...change } : c)));
  }, []);

  const dropSuggestion = useCallback((commitmentId: string) => {
    setSuggestions((list) => list.filter((s) => s.commitmentId !== commitmentId));
  }, []);

  return useMemo<DashboardDataApi>(() => {
    const messageMap = new Map(messages.map((m) => [m.id, m]));
    return {
      mode: "demo",
      state,
      error,
      commitments,
      suggestions,
      getCommitment: (id) => commitments.find((c) => c.id === id),
      getMessage: (id) => messageMap.get(id),
      reload: () => setLoadKey((k) => k + 1),
      addCommitments: (incoming, newMessages = []) => {
        if (!hasImported) {
          setCommitments(incoming);
          setSuggestions([]);
          setMessages(newMessages);
          setHasImported(true);
        } else {
          setCommitments((list) => {
            const ids = new Set(list.map((c) => c.id));
            return [...incoming.filter((c) => !ids.has(c.id)), ...list];
          });
          if (newMessages.length) setMessages((list) => [...list, ...newMessages]);
        }
        setState("ready");
      },
      markCompleted: (id) => {
        patch(id, { status: "completed" });
        dropSuggestion(id);
      },
      restore: (id) => patch(id, { status: "pending" }),
      dismiss: (id) => {
        patch(id, { status: "dismissed" });
        dropSuggestion(id);
      },
      updateDeadline: (id, dueAt) => patch(id, { dueAt }),
      generateFollowUp: async (c) => {
        await wait(700);
        return { message: demoFollowUpTemplate(c), source: "template" as const };
      },
      confirmSuggestion: (commitmentId) => {
        patch(commitmentId, { status: "completed" });
        dropSuggestion(commitmentId);
      },
      rejectSuggestion: (commitmentId) => dropSuggestion(commitmentId),
      resetDemo: () => setLoadKey((k) => k + 1),
      clearAll: () => {
        setCommitments([]);
        setSuggestions([]);
      },
    };
  }, [state, error, commitments, suggestions, messages, hasImported, patch, dropSuggestion]);
}

/**
 * DEMO TEMPLATE — not AI output. Member 4's `/api/follow-up` replaces this with a model-backed
 * follow-up that reflects the original conversation. The dialog labels it.
 */
function demoFollowUpTemplate(c: Commitment): string {
  const due = formatDue(c, new Date());
  const when = c.dueAt ? due.label.toLowerCase() : "soon";
  if (c.direction === "you_owe") {
    const to = c.beneficiary ?? "there";
    return `Hi ${to}, quick update on "${c.title.toLowerCase()}" — it's on my list and I'll have it with you ${when}. Thanks for your patience!`;
  }
  return `Hey ${c.promisor}, just checking in on "${c.title.toLowerCase()}" whenever you get a chance. You mentioned: "${c.evidenceQuote}" Thanks!`;
}
