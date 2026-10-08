import { beforeEach, describe, it } from "node:test";
import { expect } from "./expect";
import {
  CommitmentNotFoundError,
  createCommitmentStore,
  STORAGE_KEY,
  StorageWriteError,
  type StorageLike,
} from "../store";
import { InvalidDeadlineError } from "../dates";
import {
  createDemoCommitments,
  createDemoMessages,
  createDemoSuggestion,
  createDuplicateImport,
} from "../__fixtures__/demo";
import type { Commitment } from "../types";

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  failWrites = false;
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    if (this.failWrites) throw new Error("QuotaExceededError");
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

const NOW = new Date(2026, 9, 8, 12, 0, 0);
let storage: MemoryStorage;
let idCounter: number;

function makeStore() {
  return createCommitmentStore({
    storage,
    now: () => NOW,
    generateId: () => `gen-${++idCounter}`,
    syncAcrossTabs: false,
  });
}

function commitment(overrides: Partial<Commitment> = {}): Commitment {
  return {
    id: "c1",
    title: "Send the API key",
    promisor: "Alex",
    beneficiary: "Me",
    direction: "they_owe",
    dueAt: null,
    evidenceQuote: "I'll send you the API key.",
    sourceMessageId: "m1",
    confidence: "high",
    status: "pending",
    ...overrides,
  };
}

beforeEach(() => {
  storage = new MemoryStorage();
  idCounter = 0;
});

describe("saving and retrieving", () => {
  it("persists to storage and reloads in a fresh store", () => {
    const a = makeStore();
    const res = a.saveCommitments(createDemoCommitments(NOW));
    expect(res.added).toHaveLength(6);
    expect(storage.getItem(STORAGE_KEY)).toBeTruthy();

    const b = makeStore();
    expect(b.getCommitments()).toHaveLength(6);
    expect(b.getCommitment("demo-3")?.title).toBe("Send the API key");
    expect(b.getRecord("demo-3")?.createdAt).toBe(NOW.toISOString());
  });

  it("keeps the shared Commitment shape exactly (no extra fields)", () => {
    const s = makeStore();
    s.saveCommitments([commitment()]);
    expect(Object.keys(s.getCommitment("c1")!).sort()).toEqual(
      [
        "beneficiary",
        "confidence",
        "direction",
        "dueAt",
        "evidenceQuote",
        "id",
        "promisor",
        "sourceMessageId",
        "status",
        "title",
      ].sort(),
    );
  });

  it("puts the newest import first, preserving order within a batch", () => {
    const s = makeStore();
    s.saveCommitments([commitment({ id: "a", evidenceQuote: "first", title: "A" })]);
    s.saveCommitments([
      commitment({ id: "b", evidenceQuote: "second", title: "B" }),
      commitment({ id: "c", evidenceQuote: "third", title: "C" }),
    ]);
    expect(s.getCommitments().map((c) => c.id)).toEqual(["b", "c", "a"]);
  });

  it("rejects invalid commitments without failing the batch", () => {
    const s = makeStore();
    const res = s.saveCommitments([commitment(), { id: "bad" }, commitment({ id: "x", evidenceQuote: "" })]);
    expect(res.added).toHaveLength(1);
    expect(res.rejected).toHaveLength(2);
  });

  it("normalises dates on save and never invents missing ones", () => {
    const s = makeStore();
    s.saveCommitments([
      commitment({ id: "d1", title: "T1", dueAt: "2026-10-09T17:00:00Z", evidenceQuote: "q1" }),
      commitment({ id: "d2", title: "T2", dueAt: "sometime", evidenceQuote: "q2" }),
      commitment({ id: "d3", title: "T3", dueAt: null, evidenceQuote: "q3" }),
    ]);
    expect(s.getCommitment("d1")!.dueAt).toBe("2026-10-09T17:00:00.000Z");
    expect(s.getCommitment("d2")!.dueAt).toBeNull();
    expect(s.getCommitment("d3")!.dueAt).toBeNull();
  });
});

describe("duplicate imports (BRIEF Test 7)", () => {
  it("skips the same conversation imported twice, even with new ids", () => {
    const s = makeStore();
    s.saveCommitments(createDemoCommitments(NOW));
    const res = s.saveCommitments(createDuplicateImport(NOW));
    expect(res.added).toHaveLength(0);
    expect(res.duplicates).toHaveLength(6);
    expect(s.getCommitments()).toHaveLength(6);
  });

  it("matches evidence despite punctuation/case/quote-style differences", () => {
    const s = makeStore();
    s.saveCommitments([commitment()]);
    const res = s.saveCommitments([
      commitment({ id: "c2", evidenceQuote: "  i’ll SEND you the API key!! ", sourceMessageId: "m9" }),
    ]);
    expect(res.duplicates).toHaveLength(1);
  });

  it("dedupes within a single batch", () => {
    const s = makeStore();
    const res = s.saveCommitments([commitment(), commitment({ id: "c2" })]);
    expect(res.added).toHaveLength(1);
    expect(res.duplicates).toHaveLength(1);
  });

  it("does not resurrect a dismissed commitment on re-import", () => {
    const s = makeStore();
    s.saveCommitments([commitment()]);
    s.dismiss("c1");
    s.saveCommitments([commitment({ id: "c9" })]);
    expect(s.getCommitments()).toHaveLength(1);
    expect(s.getCommitment("c1")!.status).toBe("dismissed");
  });

  it("fills a missing deadline from a re-import unless the user edited it", () => {
    const s = makeStore();
    s.saveCommitments([commitment()]);
    const res = s.saveCommitments([commitment({ id: "c2", dueAt: "2026-10-10T09:00:00Z" })]);
    expect(res.updated.map((c) => c.id)).toEqual(["c1"]);
    expect(s.getCommitment("c1")!.dueAt).toBe("2026-10-10T09:00:00.000Z");

    s.updateDeadline("c1", null); // user explicitly cleared it
    s.saveCommitments([commitment({ id: "c3", dueAt: "2026-10-11T09:00:00Z" })]);
    expect(s.getCommitment("c1")!.dueAt).toBeNull();
  });

  it("re-keys colliding ids from different extractions", () => {
    const s = makeStore();
    s.saveCommitments([commitment({ id: "c1" })]);
    const res = s.saveCommitments([
      commitment({ id: "c1", title: "Pay Sarah €20", promisor: "Me", evidenceQuote: "I'll pay you €20" }),
    ]);
    expect(res.added[0].id).toBe("gen-1");
    expect(s.getCommitments()).toHaveLength(2);
  });
});

describe("status management", () => {
  it("marks completed, restores, and dismisses", () => {
    const s = makeStore();
    s.saveCommitments([commitment()]);

    expect(s.markCompleted("c1").status).toBe("completed");
    expect(s.getRecord("c1")!.completedAt).toBe(NOW.toISOString());

    expect(s.restore("c1").status).toBe("pending");
    expect(s.getRecord("c1")!.completedAt).toBeNull();

    expect(s.dismiss("c1").status).toBe("dismissed");
    expect(s.getRecord("c1")!.dismissedAt).toBe(NOW.toISOString());

    expect(s.updateStatus("c1", "pending").status).toBe("pending");
  });

  it("throws for unknown ids", () => {
    const s = makeStore();
    expect(() => s.markCompleted("nope")).toThrow(CommitmentNotFoundError);
  });

  it("edits deadlines and flags them as user-edited", () => {
    const s = makeStore();
    s.saveCommitments([commitment()]);
    s.updateDeadline("c1", "2026-10-09T17:00");
    expect(s.getCommitment("c1")!.dueAt).toBe(new Date(2026, 9, 9, 17, 0).toISOString());
    expect(s.getRecord("c1")!.deadlineEditedByUser).toBe(true);
    expect(() => s.updateDeadline("c1", "whenever")).toThrow(InvalidDeadlineError);
    s.updateDeadline("c1", null);
    expect(s.getCommitment("c1")!.dueAt).toBeNull();
  });

  it("updates editable fields with validation", () => {
    const s = makeStore();
    s.saveCommitments([commitment({ direction: "unknown" })]);
    const c = s.updateCommitment("c1", { direction: "they_owe", title: "  Send API key " });
    expect(c.direction).toBe("they_owe");
    expect(c.title).toBe("Send API key");
    expect(() => s.updateCommitment("c1", { title: " " })).toThrow();
  });

  it("removes and clears", () => {
    const s = makeStore();
    s.saveCommitments(createDemoCommitments(NOW));
    s.remove("demo-1");
    expect(s.getCommitment("demo-1")).toBeNull();
    s.clearAll();
    expect(s.getCommitments()).toHaveLength(0);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe("snapshots & subscriptions", () => {
  it("keeps snapshot identity stable until data changes", () => {
    const s = makeStore();
    s.saveCommitments([commitment()]);
    const a = s.getSnapshot();
    expect(s.getSnapshot()).toBe(a);
    s.markCompleted("c1");
    expect(s.getSnapshot()).not.toBe(a);
  });

  it("notifies subscribers on change and stops after unsubscribe", () => {
    const s = makeStore();
    let calls = 0;
    const unsub = s.subscribe(() => calls++);
    s.saveCommitments([commitment()]);
    s.dismiss("c1");
    unsub();
    s.restore("c1");
    expect(calls).toBe(2);
  });

  it("does not emit when an import adds nothing", () => {
    const s = makeStore();
    s.saveCommitments([commitment()]);
    let calls = 0;
    s.subscribe(() => calls++);
    s.saveCommitments([commitment({ id: "dup" })]);
    expect(calls).toBe(0);
  });

  it("server snapshot is always empty", () => {
    const s = makeStore();
    s.saveCommitments([commitment()]);
    expect(s.getServerSnapshot().commitments).toHaveLength(0);
  });
});

describe("storage robustness", () => {
  it("recovers from corrupt data and keeps a backup", () => {
    storage.setItem(STORAGE_KEY, "{not json");
    const s = makeStore();
    expect(s.getCommitments()).toHaveLength(0);
    expect(storage.getItem(`${STORAGE_KEY}:corrupt`)).toBe("{not json");
  });

  it("drops invalid records but keeps valid ones", () => {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        records: [{ commitment: commitment() }, { commitment: { id: "broken" } }],
        suggestions: [],
        rejectedSuggestionKeys: [],
      }),
    );
    expect(makeStore().getCommitments().map((c) => c.id)).toEqual(["c1"]);
  });

  it("surfaces write failures and leaves state unchanged", () => {
    const s = makeStore();
    s.saveCommitments([commitment()]);
    storage.failWrites = true;
    expect(() => s.markCompleted("c1")).toThrow(StorageWriteError);
    expect(s.getCommitment("c1")!.status).toBe("pending");
  });

  it("works in-memory when storage is unavailable", () => {
    const s = createCommitmentStore({ storage: null, syncAcrossTabs: false });
    s.saveCommitments([commitment()]);
    expect(s.getCommitments()).toHaveLength(1);
  });
});

describe("completion suggestions (Module E output)", () => {
  it("stores, accepts with evidence, and clears suggestions", () => {
    const s = makeStore();
    s.saveCommitments(createDemoCommitments(NOW));
    const res = s.saveSuggestions([createDemoSuggestion("demo-2")]);
    expect(res.added).toHaveLength(1);
    expect(s.getSuggestions("demo-2")).toHaveLength(1);

    const c = s.acceptSuggestion("demo-2");
    expect(c.status).toBe("completed");
    expect(s.getRecord("demo-2")!.completion?.evidenceQuote).toBe("I've just sent the report I promised.");
    expect(s.getSuggestions("demo-2")).toHaveLength(0);
  });

  it("never auto-completes: saving a suggestion leaves status pending", () => {
    const s = makeStore();
    s.saveCommitments(createDemoCommitments(NOW));
    s.saveSuggestions([createDemoSuggestion("demo-2")]);
    expect(s.getCommitment("demo-2")!.status).toBe("pending");
  });

  it("rejected suggestions are not re-suggested on re-import", () => {
    const s = makeStore();
    s.saveCommitments(createDemoCommitments(NOW));
    s.saveSuggestions([createDemoSuggestion("demo-2")]);
    s.rejectSuggestion("demo-2");
    expect(s.getSuggestions("demo-2")).toHaveLength(0);
    const again = s.saveSuggestions([{ ...createDemoSuggestion("demo-2"), sourceMessageId: "new-id" }]);
    expect(again.added).toHaveLength(0);
    expect(again.ignored).toHaveLength(1);
  });

  it("ignores suggestions for unknown or non-pending commitments and duplicates", () => {
    const s = makeStore();
    s.saveCommitments(createDemoCommitments(NOW));
    s.markCompleted("demo-1");
    const res = s.saveSuggestions([
      createDemoSuggestion("missing"),
      createDemoSuggestion("demo-1"),
      createDemoSuggestion("demo-2"),
      createDemoSuggestion("demo-2"),
    ]);
    expect(res.added).toHaveLength(1);
    expect(res.ignored).toHaveLength(3);
  });

  it("dismissing a commitment drops its open suggestions", () => {
    const s = makeStore();
    s.saveCommitments(createDemoCommitments(NOW));
    s.saveSuggestions([createDemoSuggestion("demo-2")]);
    s.dismiss("demo-2");
    expect(s.getSuggestions()).toHaveLength(0);
  });
});

describe("updateCommitment — team contract (status | dueAt)", () => {
  it("completes, undoes and dismisses through { status }", () => {
    const s = makeStore();
    s.saveCommitments([commitment()]);

    s.updateCommitment("c1", { status: "completed" });
    expect(s.getRecord("c1")).toMatchObject({ completedAt: NOW.toISOString(), dismissedAt: null });
    expect(s.getCommitment("c1")?.status).toBe("completed");

    s.updateCommitment("c1", { status: "pending" }); // undo
    expect(s.getRecord("c1")).toMatchObject({ completedAt: null, dismissedAt: null });

    s.updateCommitment("c1", { status: "dismissed" });
    expect(s.getRecord("c1")?.dismissedAt).toBe(NOW.toISOString());
  });

  it("applies field edits and a status change atomically (one notification)", () => {
    const s = makeStore();
    s.saveCommitments([commitment()]);
    let calls = 0;
    s.subscribe(() => calls++);
    s.updateCommitment("c1", { dueAt: "2026-10-09", status: "completed" });
    expect(calls).toBe(1);
    expect(s.getCommitment("c1")).toMatchObject({ status: "completed" });
    expect(s.getCommitment("c1")?.dueAt).toMatch(/^2026-10-09T/);
    expect(s.getRecord("c1")?.deadlineEditedByUser).toBe(true);
  });

  it("drops open suggestions when completed or dismissed via a patch", () => {
    const s = makeStore();
    s.saveCommitments(createDemoCommitments(NOW));
    s.saveSuggestions([createDemoSuggestion("demo-2")]);
    s.updateCommitment("demo-2", { status: "completed" });
    expect(s.getSuggestions()).toHaveLength(0);
  });

  it("rejects an invalid status without changing anything", () => {
    const s = makeStore();
    s.saveCommitments([commitment()]);
    const before = s.getSnapshot();
    expect(() => s.updateCommitment("c1", { status: "done" as never })).toThrow(/Invalid status/);
    expect(s.getSnapshot()).toBe(before);
  });
});

describe("source messages (evidence context)", () => {
  it("keeps only messages cited by stored commitments", () => {
    const s = makeStore();
    s.saveCommitments(createDemoCommitments(NOW), createDemoMessages(NOW));
    expect(s.getMessage("demo-msg-1")).toMatchObject({ sender: "Me", text: "I'll send Sarah the slides tonight." });
    expect(s.getMessage("demo-msg-unrelated")).toBeNull();
    expect(s.getSnapshot().messages).toHaveLength(6);
  });

  it("persists messages across reloads and prunes them when a commitment is removed", () => {
    const s = makeStore();
    s.saveCommitments(createDemoCommitments(NOW), createDemoMessages(NOW));
    s.remove("demo-1");
    const again = makeStore();
    expect(again.getMessage("demo-msg-1")).toBeNull();
    expect(again.getMessage("demo-msg-2")?.sender).toBe("James");
  });

  it("ignores invalid messages and keeps commitments working without them", () => {
    const s = makeStore();
    const res = s.saveCommitments([commitment()], [{ id: "m1", text: 42 }, null]);
    expect(res.added).toHaveLength(1);
    expect(s.getMessage("m1")).toBeNull();
  });
});

describe("reload and persistence flag", () => {
  it("reload() re-reads storage written elsewhere", () => {
    const a = makeStore();
    const b = makeStore();
    a.getSnapshot();
    b.saveCommitments([commitment()]);
    expect(a.getCommitments()).toHaveLength(0); // cached
    a.reload();
    expect(a.getCommitments()).toHaveLength(1);
  });

  it("reports whether storage is persistent", () => {
    expect(makeStore().isPersistent()).toBe(true);
    expect(createCommitmentStore({ storage: null }).isPersistent()).toBe(false);
  });
});
