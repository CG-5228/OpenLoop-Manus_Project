"use client";

/**
 * React hooks for Module D — consumed by the dashboard (Module A).
 *
 * Team contract (PROJECT_BRIEF §8): `useCommitments()` exposes `commitments`,
 * `addCommitments`, `updateCommitment` and `dismissCommitment`.
 *
 *   const { commitments, addCommitments, updateCommitment, dismissCommitment } = useCommitments();
 *   updateCommitment(id, { status: "completed" });   // complete
 *   updateCommitment(id, { status: "pending" });     // undo / restore
 *   updateCommitment(id, { dueAt: "2026-10-09" });   // edit deadline
 *
 *   const { commitment, displayStatus, actions } = useCommitment(id);
 *   const followUp = useFollowUp(commitment, { currentUserLabel: "Me" });
 *
 * All data comes from `commitmentStore` (localStorage). Components re-render
 * automatically on any change, including changes made in other tabs.
 *
 * Error handling: the contract functions never throw. On failure (storage
 * full/blocked, unknown id, invalid deadline) they return `null` and set the
 * shared, non-fatal `error` message; the next successful action clears it.
 * `actions.*` are the raw store methods and DO throw, for callers that want that.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  Commitment,
  CommitmentFilter,
  CommitmentPatch,
  CommitmentsSnapshot,
  CompletionSuggestion,
  DisplayStatus,
  FollowUpResponse,
  FollowUpTone,
  Message,
  SaveCommitmentsResult,
  SaveSuggestionsResult,
} from "./types";
import { commitmentStore, type CommitmentStore } from "./store";
import { computeStats, filterCommitments, getDisplayStatus, sortByUrgency } from "./status";
import { describeCommitmentDeadline, formatDeadline, isOverdue } from "./dates";
import { copyToClipboard, requestFollowUp } from "./followup-client";

// ---------------------------------------------------------------------------
// Low-level hooks
// ---------------------------------------------------------------------------

export function useCommitmentsSnapshot(store: CommitmentStore = commitmentStore): CommitmentsSnapshot {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

const noopSubscribe = () => () => {};

/** False during SSR/hydration, true once client data (localStorage) is available. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

// Shared clock: one timer for all consumers. Reading the time happens only in
// the client snapshot, never during server prerender (Next 16 rejects
// `new Date()` in prerendered Client Components).
const CLOCK_TICK_MS = 30_000;
const SERVER_NOW = new Date(0);
let clockNow: Date | null = null;
let clockTimer: ReturnType<typeof setInterval> | null = null;
const clockListeners = new Set<() => void>();

function subscribeClock(listener: () => void): () => void {
  clockListeners.add(listener);
  if (!clockTimer) {
    clockTimer = setInterval(() => {
      clockNow = new Date();
      for (const l of [...clockListeners]) l();
    }, CLOCK_TICK_MS);
  }
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0 && clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
      clockNow = null; // refresh immediately on next subscribe
    }
  };
}

function getClockSnapshot(): Date {
  if (!clockNow) clockNow = new Date();
  return clockNow;
}

/**
 * Current time, refreshed every 30s so "overdue" updates without a reload.
 * Returns the Unix epoch during SSR (no client data exists then anyway).
 */
export function useNow(): Date {
  return useSyncExternalStore(subscribeClock, getClockSnapshot, () => SERVER_NOW);
}

/** Stable, bound store actions (safe to pass as props / use in deps). */
export const commitmentActions = {
  saveCommitments: commitmentStore.saveCommitments,
  saveSuggestions: commitmentStore.saveSuggestions,
  markCompleted: commitmentStore.markCompleted,
  restore: commitmentStore.restore,
  dismiss: commitmentStore.dismiss,
  updateStatus: commitmentStore.updateStatus,
  updateDeadline: commitmentStore.updateDeadline,
  updateCommitment: commitmentStore.updateCommitment,
  acceptSuggestion: commitmentStore.acceptSuggestion,
  rejectSuggestion: commitmentStore.rejectSuggestion,
  remove: commitmentStore.remove,
  clearAll: commitmentStore.clearAll,
} as const;

export type CommitmentActions = typeof commitmentActions;

// ---------------------------------------------------------------------------
// Team-contract functions (non-throwing) + shared error state
// ---------------------------------------------------------------------------

let lastError: string | null = null;
const errorListeners = new Set<() => void>();

function setLastError(message: string | null): void {
  if (lastError === message) return;
  lastError = message;
  for (const l of [...errorListeners]) l();
}

function subscribeError(listener: () => void): () => void {
  errorListeners.add(listener);
  return () => errorListeners.delete(listener);
}

/** Last non-fatal action error shared by every hook instance (null when fine). */
export function useCommitmentsError(): string | null {
  return useSyncExternalStore(
    subscribeError,
    () => lastError,
    () => null,
  );
}

function attempt<T>(label: string, fn: () => T): T | null {
  try {
    const result = fn();
    setLastError(null);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[commitments] ${label} failed:`, message);
    setLastError(message);
    return null;
  }
}

/** Stable, non-throwing functions matching the team's `useCommitments()` contract. */
export const commitmentContract = {
  /** Store extracted commitments; duplicates are skipped. Pass the import's messages to keep cited evidence. */
  addCommitments: (commitments: readonly unknown[], messages?: readonly unknown[]): SaveCommitmentsResult | null =>
    attempt("addCommitments", () => commitmentStore.saveCommitments(commitments, messages)),
  /** Edit fields and/or change status atomically: { status }, { dueAt }, { title }, … */
  updateCommitment: (id: string, patch: CommitmentPatch): Commitment | null =>
    attempt("updateCommitment", () => commitmentStore.updateCommitment(id, patch)),
  /** "Not a commitment" — hides it from open loops (undo with updateCommitment(id, { status: "pending" })). */
  dismissCommitment: (id: string): Commitment | null =>
    attempt("dismissCommitment", () => commitmentStore.dismiss(id)),
  /** Member 5's resolution output; never auto-applied. */
  saveSuggestions: (suggestions: readonly unknown[], messages?: readonly unknown[]): SaveSuggestionsResult | null =>
    attempt("saveSuggestions", () => commitmentStore.saveSuggestions(suggestions, messages)),
  /** User confirmed a completion suggestion → completed, with its evidence recorded. */
  confirmSuggestion: (commitmentId: string, sourceMessageId?: string): Commitment | null =>
    attempt("confirmSuggestion", () => commitmentStore.acceptSuggestion(commitmentId, sourceMessageId)),
  /** User rejected a completion suggestion → removed and not re-suggested. */
  rejectSuggestion: (commitmentId: string, sourceMessageId?: string): void => {
    attempt("rejectSuggestion", () => commitmentStore.rejectSuggestion(commitmentId, sourceMessageId));
  },
  getCommitment: (id: string): Commitment | undefined => commitmentStore.getCommitment(id) ?? undefined,
  getMessage: (id: string): Message | undefined => commitmentStore.getMessage(id) ?? undefined,
  reload: (): void => {
    attempt("reload", () => commitmentStore.reload());
  },
  clearAll: (): void => {
    attempt("clearAll", () => commitmentStore.clearAll());
  },
  clearError: (): void => setLastError(null),
} as const;

// ---------------------------------------------------------------------------
// Dashboard hook
// ---------------------------------------------------------------------------

export interface UseCommitmentsOptions {
  /** "urgency" (default): overdue → soonest → no deadline → closed. "recent": newest import first. */
  sort?: "urgency" | "recent";
}

export function useCommitments(filter: CommitmentFilter = {}, options: UseCommitmentsOptions = {}) {
  const snapshot = useCommitmentsSnapshot();
  const isHydrated = useHydrated();
  const now = useNow();
  const error = useCommitmentsError();
  const { direction = "all", status = "all", query = "" } = filter;
  const sort = options.sort ?? "urgency";

  const stats = useMemo(
    () => computeStats(snapshot.commitments, { now, suggestions: snapshot.suggestions }),
    [snapshot, now],
  );

  const commitments = useMemo(() => {
    const list = filterCommitments(
      snapshot.commitments,
      { direction, status, query },
      { now, suggestions: snapshot.suggestions },
    );
    return sort === "urgency" ? sortByUrgency(list) : list;
  }, [snapshot, now, direction, status, query, sort]);

  /** Filtered commitments grouped for the "You Owe" / "They Owe You" sections. */
  const sections = useMemo(
    () => ({
      youOwe: commitments.filter((c) => c.direction === "you_owe"),
      theyOwe: commitments.filter((c) => c.direction === "they_owe"),
      unknown: commitments.filter((c) => c.direction === "unknown"),
    }),
    [commitments],
  );

  const getStatus = useCallback(
    (c: Commitment): DisplayStatus => getDisplayStatus(c, { now, suggestions: snapshot.suggestions }),
    [now, snapshot.suggestions],
  );

  const suggestions = useMemo<CompletionSuggestion[]>(
    () => [...snapshot.suggestions],
    [snapshot.suggestions],
  );

  return useMemo(
    () => ({
      // --- team contract ---
      /** Filtered + sorted (all statuses by default). */
      commitments,
      addCommitments: commitmentContract.addCommitments,
      updateCommitment: commitmentContract.updateCommitment,
      dismissCommitment: commitmentContract.dismissCommitment,

      // --- load / error state ---
      /** "loading" until browser storage has been read (SSR/hydration), then "ready". */
      state: (isHydrated ? "ready" : "loading") as "loading" | "ready" | "error",
      /** Non-fatal message from the last failed action; the dashboard should stay usable. */
      error,
      isHydrated,
      isEmpty: isHydrated && snapshot.commitments.length === 0,
      /** False if the browser blocks storage: changes will be lost on refresh. */
      isPersistent: isHydrated ? commitmentStore.isPersistent() : true,

      // --- extras ---
      sections,
      /** Everything stored, unfiltered (newest import first). */
      all: snapshot.commitments,
      records: snapshot.records,
      suggestions,
      messages: snapshot.messages,
      stats,
      now,
      getStatus,
      getCommitment: commitmentContract.getCommitment,
      getMessage: commitmentContract.getMessage,
      saveSuggestions: commitmentContract.saveSuggestions,
      confirmSuggestion: commitmentContract.confirmSuggestion,
      rejectSuggestion: commitmentContract.rejectSuggestion,
      reload: commitmentContract.reload,
      clearAll: commitmentContract.clearAll,
      clearError: commitmentContract.clearError,
      /** Raw store methods (these throw on failure). */
      actions: commitmentActions,
    }),
    [commitments, error, isHydrated, snapshot, sections, suggestions, stats, now, getStatus],
  );
}

export type UseCommitmentsResult = ReturnType<typeof useCommitments>;

// ---------------------------------------------------------------------------
// Detail hook
// ---------------------------------------------------------------------------

export function useCommitment(id: string | null | undefined) {
  const snapshot = useCommitmentsSnapshot();
  const isHydrated = useHydrated();
  const now = useNow();

  const record = useMemo(
    () => (id ? (snapshot.records.find((r) => r.commitment.id === id) ?? null) : null),
    [snapshot, id],
  );
  const suggestions = useMemo(
    () => (id ? snapshot.suggestions.filter((s) => s.commitmentId === id) : []),
    [snapshot, id],
  );
  const commitment = record?.commitment ?? null;

  const actions = useMemo(
    () =>
      id
        ? {
            markCompleted: () => commitmentStore.markCompleted(id),
            restore: () => commitmentStore.restore(id),
            dismiss: () => commitmentStore.dismiss(id),
            updateDeadline: (dueAt: string | Date | null) => commitmentStore.updateDeadline(id, dueAt),
            updateCommitment: (patch: Parameters<CommitmentStore["updateCommitment"]>[1]) =>
              commitmentStore.updateCommitment(id, patch),
            acceptSuggestion: (sourceMessageId?: string) =>
              commitmentStore.acceptSuggestion(id, sourceMessageId),
            rejectSuggestion: (sourceMessageId?: string) =>
              commitmentStore.rejectSuggestion(id, sourceMessageId),
            remove: () => commitmentStore.remove(id),
          }
        : null,
    [id],
  );

  return {
    commitment,
    record,
    suggestions,
    displayStatus: commitment ? getDisplayStatus(commitment, { now, suggestions }) : null,
    isOverdue: commitment ? isOverdue(commitment, now) : false,
    deadlineLabel: commitment ? describeCommitmentDeadline(commitment, now) : null,
    deadlineFormatted: commitment ? formatDeadline(commitment.dueAt) : null,
    isHydrated,
    notFound: isHydrated && Boolean(id) && !commitment,
    actions,
  };
}

// ---------------------------------------------------------------------------
// Follow-up hook
// ---------------------------------------------------------------------------

export type FollowUpStatus = "idle" | "loading" | "ready" | "error";

export interface UseFollowUpOptions {
  currentUserLabel?: string;
  tone?: FollowUpTone;
  /** Accept a labelled non-AI template when AI is unavailable. Only if you display `source`/`notice`. */
  allowTemplate?: boolean;
}

/**
 * Generate → review/edit → copy. The draft is editable (`setDraft`) and is
 * never sent anywhere by OpenLoop.
 */
export function useFollowUp(commitment: Commitment | null, options: UseFollowUpOptions = {}) {
  const [status, setStatus] = useState<FollowUpStatus>("idle");
  const [draft, setDraft] = useState("");
  const [meta, setMeta] = useState<Omit<FollowUpResponse, "message"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitmentId = commitment?.id ?? null;

  // Reset when switching to a different commitment (adjust-state-during-render
  // pattern; avoids a setState-in-effect cascade).
  const [forId, setForId] = useState(commitmentId);
  if (forId !== commitmentId) {
    setForId(commitmentId);
    setStatus("idle");
    setDraft("");
    setMeta(null);
    setError(null);
    setCopied(false);
  }

  // Abort any in-flight request when the commitment changes or on unmount.
  useEffect(() => () => abortRef.current?.abort(), [commitmentId]);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
    setDraft("");
    setMeta(null);
    setError(null);
    setCopied(false);
  }, []);

  const generate = useCallback(
    async (overrides: { tone?: FollowUpTone } = {}) => {
      if (!commitment) return null;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus("loading");
      setError(null);
      setCopied(false);
      try {
        const res = await requestFollowUp(commitment, {
          currentUserLabel: options.currentUserLabel,
          tone: overrides.tone ?? options.tone,
          allowTemplate: options.allowTemplate,
          signal: controller.signal,
        });
        if (controller.signal.aborted || abortRef.current !== controller) return null;
        setDraft(res.message);
        setMeta({ source: res.source, model: res.model, notice: res.notice });
        setStatus("ready");
        return res;
      } catch (err) {
        if ((err as Error)?.name === "AbortError" || abortRef.current !== controller) return null;
        setError((err as Error)?.message ?? "Could not generate a follow-up.");
        setStatus("error");
        return null;
      }
    },
    [commitment, options.currentUserLabel, options.tone, options.allowTemplate],
  );

  const copy = useCallback(async () => {
    if (!draft) return false;
    const ok = await copyToClipboard(draft);
    setCopied(ok);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    if (ok) copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    return ok;
  }, [draft]);

  return {
    status,
    isLoading: status === "loading",
    draft,
    setDraft,
    /** "ai" or "template" — show a label when it's a template. */
    source: meta?.source ?? null,
    model: meta?.model ?? null,
    notice: meta?.notice ?? null,
    error,
    generate,
    copy,
    copied,
    reset,
  };
}
