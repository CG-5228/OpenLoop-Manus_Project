/**
 * Browser-persisted commitment store (localStorage), read through
 * `useSyncExternalStore` so server prerendering and hydration stay consistent.
 *
 * This is OpenLoop's storage layer for the demo release: no accounts and no
 * server database. Data stays in the user's browser, survives a refresh and
 * syncs across tabs.
 */
import type { Commitment, Message } from "@/types/openloop";

const KEY = "openloop:v1";

export interface StoredData {
  commitments: Commitment[];
  messages: Message[];
}

const EMPTY: StoredData = { commitments: [], messages: [] };
let cache: StoredData | null = null;
const listeners = new Set<() => void>();

function read(): StoredData {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<StoredData> | null;
    if (!parsed || !Array.isArray(parsed.commitments)) return EMPTY;
    return {
      commitments: parsed.commitments,
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    };
  } catch {
    return EMPTY;
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeStore(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getStoreSnapshot(): StoredData | null {
  if (!cache) cache = read();
  return cache;
}

/** Nothing is stored on the server: render the loading state until hydration. */
export function getServerStoreSnapshot(): StoredData | null {
  return null;
}

export function reloadStore() {
  cache = null;
  emit();
}

export function updateStore(update: (data: StoredData) => StoredData) {
  const next = update(getStoreSnapshot() ?? EMPTY);
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full or unavailable (e.g. private mode): keep working in memory.
  }
  emit();
}

/**
 * Merge newly extracted commitments. Existing IDs (content-based, from the
 * extraction endpoint) keep the user's status and edited deadline, so
 * re-importing a conversation never reopens or duplicates a loop.
 */
export function mergeCommitments(data: StoredData, incoming: Commitment[], messages: Message[]): StoredData {
  const existing = new Map(data.commitments.map((c) => [c.id, c]));
  const fresh = incoming.filter((c) => !existing.has(c.id));
  const knownMessages = new Set(data.messages.map((m) => m.id));
  return {
    commitments: [...fresh, ...data.commitments],
    messages: [...data.messages, ...messages.filter((m) => !knownMessages.has(m.id))],
  };
}

export const EMPTY_STORE = EMPTY;
