"use client";

/**
 * DashboardDataProvider — the single data seam for the dashboard UI.
 *
 * TEMPORARY PLACEHOLDER (Member 1): Member 4's `useCommitments()` hook
 * (`feature/commitments`) and Member 5's resolve endpoint were not on `main`
 * when this was written. This provider therefore runs a clearly-labelled
 * in-memory DEMO adapter over synthetic fixtures. It does not persist anything
 * (browser storage is Member 4's responsibility).
 *
 * To integrate: add a `useLiveAdapter()` that maps Member 4's hook onto
 * `DashboardDataApi` (mapping documented in lib/ui/dashboard-data-api.ts),
 * uses `requestFollowUp()` from lib/ui/api-client.ts, returns `mode: "live"`,
 * and use it here instead of `useDemoAdapter()`.
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
} from "react";
import type { Commitment, CompletionSuggestion, Message } from "@/types/openloop";
import type { DashboardDataApi, LoadState } from "@/lib/ui/dashboard-data-api";
import { createDemoDataset } from "@/lib/mock/demo-data";
import { formatDue } from "@/lib/ui/commitment-view";

const CommitmentsContext = createContext<DashboardDataApi | null>(null);

export function useDashboardData(): DashboardDataApi {
  const ctx = useContext(CommitmentsContext);
  if (!ctx) {
    throw new Error("useDashboardData must be used within <DashboardDataProvider>");
  }
  return ctx;
}

export function DashboardDataProvider({ children }: { children: React.ReactNode }) {
  const api = useDemoAdapter();
  return (
    <CommitmentsContext.Provider value={api}>{children}</CommitmentsContext.Provider>
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
        setCommitments((list) => {
          const ids = new Set(list.map((c) => c.id));
          return [...incoming.filter((c) => !ids.has(c.id)), ...list];
        });
        if (newMessages.length) setMessages((list) => [...list, ...newMessages]);
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
        return demoFollowUpTemplate(c);
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
  }, [state, error, commitments, suggestions, messages, patch, dropSuggestion]);
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
