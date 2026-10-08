"use client";

/**
 * DashboardDataProvider — the single data seam for the dashboard UI.
 *
 * Live adapter: commitments come from the extraction endpoint (via the import
 * flow) and are persisted in this browser (lib/ui/commitment-store). Every UI
 * component reads and mutates data only through `useDashboardData()`, so a
 * future server-backed store can replace this adapter without UI changes.
 *
 * Follow-ups are drafted from a template (no AI follow-up endpoint exists);
 * the dialog labels them as such. Completion suggestions (optional P2) are not
 * produced in this release.
 *
 * QA helper: append `?demo-state=loading|empty|error` to any app URL to
 * preview the loading, empty and error states.
 */
import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import type { Commitment } from "@/types/openloop";
import type { DashboardDataApi, LoadState } from "@/lib/ui/dashboard-data-api";
import {
  EMPTY_STORE,
  getServerStoreSnapshot,
  getStoreSnapshot,
  mergeCommitments,
  reloadStore,
  subscribeStore,
  updateStore,
} from "@/lib/ui/commitment-store";
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
  const api = useLiveAdapter();
  return <CommitmentsContext.Provider value={api}>{children}</CommitmentsContext.Provider>;
}

const noopSubscribe = () => () => {};
const readForcedState = () => new URLSearchParams(window.location.search).get("demo-state");
const noForcedState = () => null;

function patch(id: string, change: Partial<Commitment>) {
  updateStore((data) => ({
    ...data,
    commitments: data.commitments.map((c) => (c.id === id ? { ...c, ...change } : c)),
  }));
}

function useLiveAdapter(): DashboardDataApi {
  const stored = useSyncExternalStore(subscribeStore, getStoreSnapshot, getServerStoreSnapshot);
  const forced = useSyncExternalStore(noopSubscribe, readForcedState, noForcedState);

  return useMemo<DashboardDataApi>(() => {
    const data = forced === "empty" ? EMPTY_STORE : (stored ?? EMPTY_STORE);
    const state: LoadState =
      stored === null || forced === "loading" ? "loading" : forced === "error" ? "error" : "ready";
    const messageMap = new Map(data.messages.map((m) => [m.id, m]));

    return {
      mode: "live",
      followUpKind: "template",
      state,
      error:
        state === "error"
          ? "Your saved commitments couldn't be read. Your data hasn't been changed."
          : null,
      commitments: data.commitments,
      suggestions: [],
      getCommitment: (id) => data.commitments.find((c) => c.id === id),
      getMessage: (id) => messageMap.get(id),
      reload: reloadStore,
      addCommitments: (incoming, messages = []) =>
        updateStore((current) => mergeCommitments(current, incoming, messages)),
      markCompleted: (id) => patch(id, { status: "completed" }),
      restore: (id) => patch(id, { status: "pending" }),
      dismiss: (id) => patch(id, { status: "dismissed" }),
      updateDeadline: (id, dueAt) => patch(id, { dueAt }),
      generateFollowUp: async (c) => followUpTemplate(c),
      confirmSuggestion: (commitmentId) => patch(commitmentId, { status: "completed" }),
      rejectSuggestion: () => {},
      clearAll: () => updateStore(() => EMPTY_STORE),
    };
  }, [stored, forced]);
}

/** Template follow-up (not AI). The dialog labels it; the user reviews and sends it themselves. */
function followUpTemplate(c: Commitment): string {
  const due = formatDue(c, new Date());
  const when = c.dueAt ? due.label.toLowerCase() : "soon";
  const task = c.title.charAt(0).toLowerCase() + c.title.slice(1);
  if (c.direction === "you_owe") {
    const to = c.beneficiary ?? "there";
    return `Hi ${to}, quick update on "${task}": it's on my list and I'll have it with you ${when}. Thanks for your patience!`;
  }
  return `Hey ${c.promisor}, just checking in on "${task}" whenever you get a chance. You mentioned: "${c.evidenceQuote}" Thanks!`;
}
