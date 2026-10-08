/**
 * Commitment storage — Module D.
 *
 * A small external store backed by localStorage (hackathon MVP; swap the
 * StorageLike adapter for a database-backed one later). Designed for
 * React's useSyncExternalStore: `getSnapshot()` returns a cached, immutable
 * snapshot that only changes identity when data changes.
 *
 *   import { commitmentStore } from "@/lib/commitments";
 *   commitmentStore.saveCommitments(response.commitments);
 *   commitmentStore.markCompleted(id);
 *
 * Browser-only for mutations: the default `commitmentStore` throws if a
 * mutation is attempted during server rendering (it would otherwise leak
 * data between requests).
 */

import type {
  Commitment,
  CommitmentPatch,
  CommitmentRecord,
  CommitmentsSnapshot,
  CommitmentStatus,
  CompletionEvidence,
  CompletionSuggestion,
  Message,
  SaveCommitmentsResult,
  SaveSuggestionsResult,
} from "./types";
import { normalizeDeadlineInput } from "./dates";
import { FingerprintIndex, suggestionKey } from "./dedupe";
import { validateCommitment, validateCompletionSuggestion, validateMessage } from "./validate";

export const STORAGE_KEY = "openloop:commitments:v1";
const STATE_VERSION = 1;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface PersistedState {
  version: typeof STATE_VERSION;
  records: CommitmentRecord[];
  suggestions: CompletionSuggestion[];
  /** Keys of suggestions the user rejected, so re-imports don't resurface them. */
  rejectedSuggestionKeys: string[];
  /** Only messages cited as evidence are kept (never whole conversations). */
  messages: Message[];
}

export class CommitmentNotFoundError extends Error {
  constructor(id: string) {
    super(`Commitment not found: ${id}`);
    this.name = "CommitmentNotFoundError";
  }
}

export class StorageWriteError extends Error {
  constructor(cause: unknown) {
    super(
      `Could not save commitments to browser storage${
        cause instanceof Error ? `: ${cause.message}` : ""
      }`,
    );
    this.name = "StorageWriteError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export interface CommitmentStoreOptions {
  /** Storage adapter, or a lazy getter. `null` = in-memory only. */
  storage?: StorageLike | null | (() => StorageLike | null);
  key?: string;
  now?: () => Date;
  generateId?: () => string;
  /** Listen for `storage` events to sync across browser tabs. Default true. */
  syncAcrossTabs?: boolean;
  /** Throw on mutations when `window` is undefined (SSR). Default false. */
  browserOnlyMutations?: boolean;
}

export interface CommitmentStore {
  // --- subscription (useSyncExternalStore) ---
  subscribe(listener: () => void): () => void;
  getSnapshot(): CommitmentsSnapshot;
  getServerSnapshot(): CommitmentsSnapshot;

  // --- reads ---
  getCommitments(): readonly Commitment[];
  getCommitment(id: string): Commitment | null;
  getRecord(id: string): CommitmentRecord | null;
  getSuggestions(commitmentId?: string): readonly CompletionSuggestion[];
  /** A stored source message (evidence sender/timestamp), if it was provided on import. */
  getMessage(id: string): Message | null;
  /** False when browser storage is unavailable (e.g. blocked): data lasts only for this tab. */
  isPersistent(): boolean;
  /** Re-read from storage (e.g. after an external change) and notify subscribers. */
  reload(): void;

  // --- writes ---
  /**
   * Save extracted commitments, skipping duplicates (BRIEF Test 7). Optionally
   * pass the imported messages: only those cited as evidence are stored.
   */
  saveCommitments(incoming: readonly unknown[], messages?: readonly unknown[]): SaveCommitmentsResult;
  updateStatus(id: string, status: CommitmentStatus): Commitment;
  markCompleted(id: string, evidence?: Omit<CompletionEvidence, "confirmedAt">): Commitment;
  /** Restore a completed or dismissed commitment to pending. */
  restore(id: string): Commitment;
  dismiss(id: string): Commitment;
  /** Accepts ISO, "YYYY-MM-DD", datetime-local values, a Date, or null to clear. */
  updateDeadline(id: string, dueAt: string | Date | null): Commitment;
  updateCommitment(id: string, patch: CommitmentPatch): Commitment;
  /** Permanently delete (prefer `dismiss` for user-facing "not a commitment"). */
  remove(id: string): void;
  clearAll(): void;

  // --- completion suggestions (Module E output) ---
  saveSuggestions(incoming: readonly unknown[], messages?: readonly unknown[]): SaveSuggestionsResult;
  /** User confirms: marks the commitment completed with the suggestion's evidence. */
  acceptSuggestion(commitmentId: string, sourceMessageId?: string): Commitment;
  /** User rejects: suggestion is removed and won't be re-suggested. */
  rejectSuggestion(commitmentId: string, sourceMessageId?: string): void;
}

const EMPTY_SNAPSHOT: CommitmentsSnapshot = Object.freeze({
  commitments: Object.freeze([]) as readonly Commitment[],
  records: Object.freeze([]) as readonly CommitmentRecord[],
  suggestions: Object.freeze([]) as readonly CompletionSuggestion[],
  messages: Object.freeze([]) as readonly Message[],
});

function emptyState(): PersistedState {
  return {
    version: STATE_VERSION,
    records: [],
    suggestions: [],
    rejectedSuggestionKeys: [],
    messages: [],
  };
}

function defaultGenerateId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function isoOrNull(v: unknown): string | null {
  return typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : null;
}

const VALID_STATUSES: readonly CommitmentStatus[] = ["pending", "completed", "dismissed"];

/** Pure status transition with consistent bookkeeping. */
function applyStatus(
  r: CommitmentRecord,
  status: CommitmentStatus,
  nowIso: string,
  evidence?: Omit<CompletionEvidence, "confirmedAt">,
): CommitmentRecord {
  if (!VALID_STATUSES.includes(status)) throw new ValidationError(`Invalid status: ${String(status)}`);
  const commitment = { ...r.commitment, status };
  if (status === "completed") {
    return {
      ...r,
      commitment,
      completedAt: r.commitment.status === "completed" && r.completedAt ? r.completedAt : nowIso,
      dismissedAt: null,
      completion: evidence ? { ...evidence, confirmedAt: nowIso } : r.completion,
    };
  }
  if (status === "dismissed") {
    return { ...r, commitment, dismissedAt: nowIso, completedAt: null };
  }
  return { ...r, commitment, completedAt: null, dismissedAt: null, completion: null };
}

/** Message ids referenced by stored commitments, suggestions or completion evidence. */
function citedMessageIds(st: Pick<PersistedState, "records" | "suggestions">): Set<string> {
  const ids = new Set<string>();
  for (const r of st.records) {
    ids.add(r.commitment.sourceMessageId);
    if (r.completion) ids.add(r.completion.sourceMessageId);
  }
  for (const s of st.suggestions) ids.add(s.sourceMessageId);
  return ids;
}

/** Merge newly provided messages (only cited ones) and drop uncited ones. */
function withMessages(st: PersistedState, incoming: readonly unknown[] | undefined): PersistedState {
  const cited = citedMessageIds(st);
  const byId = new Map<string, Message>();
  for (const m of st.messages) if (cited.has(m.id)) byId.set(m.id, m);
  if (Array.isArray(incoming)) {
    for (const raw of incoming) {
      const v = validateMessage(raw);
      if (v.ok && cited.has(v.value.id)) byId.set(v.value.id, v.value);
    }
  }
  return { ...st, messages: [...byId.values()] };
}

/** Defensive parse of persisted data; invalid entries are dropped, not fatal. */
function parseState(raw: string): PersistedState {
  const data = JSON.parse(raw) as Partial<PersistedState> | null;
  if (!data || typeof data !== "object" || data.version !== STATE_VERSION) {
    throw new Error("Unrecognised commitments storage format");
  }
  const state = emptyState();
  const seen = new Set<string>();
  for (const r of Array.isArray(data.records) ? data.records : []) {
    const v = validateCommitment((r as CommitmentRecord | undefined)?.commitment);
    if (!v.ok || seen.has(v.value.id)) continue;
    seen.add(v.value.id);
    const rec = r as Partial<CommitmentRecord>;
    const fallback = new Date(0).toISOString();
    state.records.push({
      commitment: v.value,
      createdAt: isoOrNull(rec.createdAt) ?? fallback,
      updatedAt: isoOrNull(rec.updatedAt) ?? fallback,
      completedAt: isoOrNull(rec.completedAt),
      dismissedAt: isoOrNull(rec.dismissedAt),
      deadlineEditedByUser: rec.deadlineEditedByUser === true,
      completion:
        rec.completion && typeof rec.completion === "object" ? rec.completion : null,
    });
  }
  for (const s of Array.isArray(data.suggestions) ? data.suggestions : []) {
    const v = validateCompletionSuggestion(s);
    if (v.ok && seen.has(v.value.commitmentId)) state.suggestions.push(v.value);
  }
  if (Array.isArray(data.rejectedSuggestionKeys)) {
    state.rejectedSuggestionKeys = data.rejectedSuggestionKeys.filter(
      (k): k is string => typeof k === "string",
    );
  }
  for (const m of Array.isArray(data.messages) ? data.messages : []) {
    const v = validateMessage(m);
    if (v.ok) state.messages.push(v.value);
  }
  return state;
}

function buildSnapshot(state: PersistedState): CommitmentsSnapshot {
  return Object.freeze({
    commitments: Object.freeze(state.records.map((r) => r.commitment)),
    records: Object.freeze([...state.records]),
    suggestions: Object.freeze([...state.suggestions]),
    messages: Object.freeze([...state.messages]),
  });
}

export function createCommitmentStore(options: CommitmentStoreOptions = {}): CommitmentStore {
  const key = options.key ?? STORAGE_KEY;
  const now = options.now ?? (() => new Date());
  const generateId = options.generateId ?? defaultGenerateId;
  const syncAcrossTabs = options.syncAcrossTabs ?? true;

  let resolvedStorage: StorageLike | null | undefined;
  let state: PersistedState | null = null;
  let snapshot: CommitmentsSnapshot = EMPTY_SNAPSHOT;
  const listeners = new Set<() => void>();
  let detachStorageListener: (() => void) | null = null;

  function storage(): StorageLike | null {
    if (resolvedStorage === undefined) {
      const s = options.storage;
      resolvedStorage = typeof s === "function" ? s() : (s ?? null);
    }
    return resolvedStorage;
  }

  function load(): PersistedState {
    const s = storage();
    if (!s) return emptyState();
    let raw: string | null = null;
    try {
      raw = s.getItem(key);
      return raw ? parseState(raw) : emptyState();
    } catch (err) {
      // Corrupt or foreign data: keep a backup instead of destroying it.
      if (raw) {
        try {
          s.setItem(`${key}:corrupt`, raw);
        } catch {
          /* ignore */
        }
      }
      console.warn("[commitments] Ignoring unreadable stored data:", err);
      return emptyState();
    }
  }

  function ensure(): PersistedState {
    if (!state) {
      state = load();
      snapshot = buildSnapshot(state);
    }
    return state;
  }

  function emit(): void {
    for (const l of [...listeners]) {
      try {
        l();
      } catch (err) {
        console.error("[commitments] listener failed:", err);
      }
    }
  }

  function guardMutation(): void {
    if (options.browserOnlyMutations && typeof window === "undefined") {
      throw new Error("commitmentStore mutations are browser-only (called during SSR).");
    }
  }

  function commit(next: PersistedState): void {
    const s = storage();
    if (s) {
      try {
        s.setItem(key, JSON.stringify(next));
      } catch (err) {
        throw new StorageWriteError(err);
      }
    }
    state = next;
    snapshot = buildSnapshot(next);
    emit();
  }

  function findIndex(st: PersistedState, id: string): number {
    const i = st.records.findIndex((r) => r.commitment.id === id);
    if (i < 0) throw new CommitmentNotFoundError(id);
    return i;
  }

  /** Apply `fn` to one record immutably and persist. */
  function mutate(
    id: string,
    fn: (r: CommitmentRecord, nowIso: string) => CommitmentRecord,
    opts: { dropSuggestions?: boolean } = {},
  ): Commitment {
    guardMutation();
    const st = ensure();
    const i = findIndex(st, id);
    const nowIso = now().toISOString();
    const updated = { ...fn(st.records[i], nowIso), updatedAt: nowIso };
    const records = [...st.records];
    records[i] = updated;
    const next: PersistedState = { ...st, records };
    commit(
      opts.dropSuggestions
        ? withMessages(
            { ...next, suggestions: st.suggestions.filter((s) => s.commitmentId !== id) },
            undefined,
          )
        : next,
    );
    return updated.commitment;
  }

  function attachStorageListener(): void {
    if (!syncAcrossTabs || detachStorageListener || typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== null && e.key !== key) return;
      state = load();
      snapshot = buildSnapshot(state);
      emit();
    };
    window.addEventListener("storage", onStorage);
    detachStorageListener = () => window.removeEventListener("storage", onStorage);
  }

  const store: CommitmentStore = {
    subscribe(listener) {
      listeners.add(listener);
      attachStorageListener();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && detachStorageListener) {
          detachStorageListener();
          detachStorageListener = null;
        }
      };
    },

    getSnapshot() {
      ensure();
      return snapshot;
    },

    getServerSnapshot() {
      return EMPTY_SNAPSHOT;
    },

    getCommitments() {
      return store.getSnapshot().commitments;
    },

    getCommitment(id) {
      return ensure().records.find((r) => r.commitment.id === id)?.commitment ?? null;
    },

    getRecord(id) {
      return ensure().records.find((r) => r.commitment.id === id) ?? null;
    },

    getSuggestions(commitmentId) {
      const all = store.getSnapshot().suggestions;
      return commitmentId ? all.filter((s) => s.commitmentId === commitmentId) : all;
    },

    getMessage(id) {
      return ensure().messages.find((m) => m.id === id) ?? null;
    },

    isPersistent() {
      return storage() !== null;
    },

    reload() {
      state = load();
      snapshot = buildSnapshot(state);
      emit();
    },

    saveCommitments(incoming, messages) {
      guardMutation();
      const st = ensure();
      const result: SaveCommitmentsResult = { added: [], updated: [], duplicates: [], rejected: [] };
      if (!Array.isArray(incoming)) {
        result.rejected.push({ input: incoming, reason: "expected an array of commitments" });
        return result;
      }

      const nowIso = now().toISOString();
      const existing = [...st.records];
      const fresh: CommitmentRecord[] = [];
      const index = new FingerprintIndex(existing.map((r) => r.commitment));
      const ids = new Set(existing.map((r) => r.commitment.id));
      const updatedIds = new Set<string>();
      let changed = false;

      const locate = (id: string): { list: CommitmentRecord[]; i: number } | null => {
        let i = fresh.findIndex((r) => r.commitment.id === id);
        if (i >= 0) return { list: fresh, i };
        i = existing.findIndex((r) => r.commitment.id === id);
        return i >= 0 ? { list: existing, i } : null;
      };

      for (const raw of incoming) {
        const v = validateCommitment(raw);
        if (!v.ok) {
          result.rejected.push({ input: raw, reason: v.reason });
          continue;
        }
        let c = v.value;

        const dupId = index.findDuplicate(c);
        if (dupId) {
          result.duplicates.push(c);
          // Enrich: a re-import may carry a deadline the first pass missed.
          const hit = locate(dupId);
          if (hit) {
            const r = hit.list[hit.i];
            if (
              !r.commitment.dueAt &&
              c.dueAt &&
              !r.deadlineEditedByUser &&
              r.commitment.status === "pending"
            ) {
              hit.list[hit.i] = {
                ...r,
                commitment: { ...r.commitment, dueAt: c.dueAt },
                updatedAt: nowIso,
              };
              updatedIds.add(dupId);
              changed = true;
            }
          }
          continue;
        }

        // Ids from extraction may collide across imports (e.g. "c1"); re-key.
        if (ids.has(c.id)) c = { ...c, id: generateId() };
        ids.add(c.id);
        index.add(c);
        fresh.push({
          commitment: c,
          createdAt: nowIso,
          updatedAt: nowIso,
          completedAt: c.status === "completed" ? nowIso : null,
          dismissedAt: c.status === "dismissed" ? nowIso : null,
          deadlineEditedByUser: false,
          completion: null,
        });
        result.added.push(c);
        changed = true;
      }

      const next = withMessages({ ...st, records: [...fresh, ...existing] }, messages);
      const messagesChanged =
        next.messages.length !== st.messages.length ||
        next.messages.some((m, i) => m !== st.messages[i]);
      if (changed || messagesChanged) {
        // Newest import first; conversation order preserved within a batch.
        commit(next);
        for (const id of updatedIds) {
          const c = store.getCommitment(id);
          if (c) result.updated.push(c);
        }
      }
      return result;
    },

    updateStatus(id, status) {
      if (!VALID_STATUSES.includes(status)) throw new ValidationError(`Invalid status: ${String(status)}`);
      return mutate(id, (r, nowIso) => applyStatus(r, status, nowIso), {
        dropSuggestions: status !== "pending",
      });
    },

    markCompleted(id, evidence) {
      return mutate(id, (r, nowIso) => applyStatus(r, "completed", nowIso, evidence), {
        dropSuggestions: true,
      });
    },

    restore(id) {
      return mutate(id, (r, nowIso) => applyStatus(r, "pending", nowIso));
    },

    dismiss(id) {
      return mutate(id, (r, nowIso) => applyStatus(r, "dismissed", nowIso), {
        dropSuggestions: true,
      });
    },

    updateDeadline(id, dueAt) {
      const normalized = normalizeDeadlineInput(dueAt); // throws InvalidDeadlineError
      return mutate(id, (r) => ({
        ...r,
        commitment: { ...r.commitment, dueAt: normalized },
        deadlineEditedByUser: true,
      }));
    },

    updateCommitment(id, patch) {
      const next: Partial<Commitment> = {};
      if (patch.title !== undefined) {
        if (typeof patch.title !== "string" || !patch.title.trim())
          throw new ValidationError("Title cannot be empty");
        next.title = patch.title.trim();
      }
      if (patch.beneficiary !== undefined) {
        if (patch.beneficiary !== null && typeof patch.beneficiary !== "string")
          throw new ValidationError("Beneficiary must be a string or null");
        next.beneficiary = patch.beneficiary?.trim() || null;
      }
      if (patch.direction !== undefined) {
        if (!["you_owe", "they_owe", "unknown"].includes(patch.direction))
          throw new ValidationError(`Invalid direction: ${String(patch.direction)}`);
        next.direction = patch.direction;
      }
      const deadlineEdited = patch.dueAt !== undefined;
      if (deadlineEdited) next.dueAt = normalizeDeadlineInput(patch.dueAt);
      const status = patch.status;
      if (status !== undefined && !VALID_STATUSES.includes(status))
        throw new ValidationError(`Invalid status: ${String(status)}`);
      return mutate(
        id,
        (r, nowIso) => {
          const edited: CommitmentRecord = {
            ...r,
            commitment: { ...r.commitment, ...next },
            deadlineEditedByUser: r.deadlineEditedByUser || deadlineEdited,
          };
          return status !== undefined && status !== r.commitment.status
            ? applyStatus(edited, status, nowIso)
            : edited;
        },
        { dropSuggestions: status !== undefined && status !== "pending" },
      );
    },

    remove(id) {
      guardMutation();
      const st = ensure();
      findIndex(st, id);
      commit(
        withMessages(
          {
            ...st,
            records: st.records.filter((r) => r.commitment.id !== id),
            suggestions: st.suggestions.filter((s) => s.commitmentId !== id),
          },
          undefined,
        ),
      );
    },

    clearAll() {
      guardMutation();
      ensure();
      const s = storage();
      try {
        s?.removeItem(key);
      } catch (err) {
        throw new StorageWriteError(err);
      }
      state = emptyState();
      snapshot = buildSnapshot(state);
      emit();
    },

    saveSuggestions(incoming, messages) {
      guardMutation();
      const st = ensure();
      const result: SaveSuggestionsResult = { added: [], ignored: [] };
      if (!Array.isArray(incoming)) return result;

      const pendingIds = new Set(
        st.records.filter((r) => r.commitment.status === "pending").map((r) => r.commitment.id),
      );
      const rejected = new Set(st.rejectedSuggestionKeys);
      const present = new Set(st.suggestions.map(suggestionKey));
      const added: CompletionSuggestion[] = [];

      for (const raw of incoming) {
        const v = validateCompletionSuggestion(raw);
        if (!v.ok) continue;
        const s = v.value;
        const k = suggestionKey(s);
        if (!pendingIds.has(s.commitmentId) || rejected.has(k) || present.has(k)) {
          result.ignored.push(s);
          continue;
        }
        present.add(k);
        added.push(s);
      }
      if (added.length)
        commit(withMessages({ ...st, suggestions: [...st.suggestions, ...added] }, messages));
      result.added = added;
      return result;
    },

    acceptSuggestion(commitmentId, sourceMessageId) {
      const st = ensure();
      const s = st.suggestions.find(
        (x) =>
          x.commitmentId === commitmentId &&
          (sourceMessageId === undefined || x.sourceMessageId === sourceMessageId),
      );
      if (!s) throw new ValidationError(`No open suggestion for commitment ${commitmentId}`);
      return store.markCompleted(commitmentId, {
        sourceMessageId: s.sourceMessageId,
        evidenceQuote: s.evidenceQuote,
        confidence: s.confidence,
        reason: s.reason,
      });
    },

    rejectSuggestion(commitmentId, sourceMessageId) {
      guardMutation();
      const st = ensure();
      const matches = (x: CompletionSuggestion) =>
        x.commitmentId === commitmentId &&
        (sourceMessageId === undefined || x.sourceMessageId === sourceMessageId);
      const rejectedNow = st.suggestions.filter(matches);
      if (!rejectedNow.length) return;
      commit(
        withMessages(
          {
            ...st,
            suggestions: st.suggestions.filter((x) => !matches(x)),
            rejectedSuggestionKeys: [
              ...new Set([...st.rejectedSuggestionKeys, ...rejectedNow.map(suggestionKey)]),
            ],
          },
          undefined,
        ),
      );
    },
  };

  return store;
}

/** localStorage if available and writable (private-mode Safari can throw). */
export function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    const ls = window.localStorage;
    const probe = "__openloop_probe__";
    ls.setItem(probe, "1");
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

/** App-wide singleton used by the hooks and other modules. */
export const commitmentStore: CommitmentStore = createCommitmentStore({
  storage: getBrowserStorage,
  browserOnlyMutations: true,
});
