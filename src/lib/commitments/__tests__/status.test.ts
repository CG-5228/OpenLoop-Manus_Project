import { describe, it } from "node:test";
import { expect } from "./expect";
import {
  computeStats,
  counterpartyOf,
  filterCommitments,
  getDisplayStatus,
  sortByUrgency,
} from "../status";
import { createDemoCommitments, createDemoSuggestion } from "../__fixtures__/demo";

const NOW = new Date(2026, 9, 8, 12, 0, 0);
const demo = createDemoCommitments(NOW);
const byId = (id: string) => demo.find((c) => c.id === id)!;

describe("getDisplayStatus", () => {
  it("derives overdue from the deadline", () => {
    expect(getDisplayStatus(byId("demo-2"), { now: NOW })).toBe("overdue");
    expect(getDisplayStatus(byId("demo-1"), { now: NOW })).toBe("pending");
    expect(getDisplayStatus(byId("demo-3"), { now: NOW })).toBe("pending"); // no deadline
  });

  it("flags low confidence and open suggestions as needs_review", () => {
    expect(getDisplayStatus(byId("demo-5"), { now: NOW })).toBe("needs_review");
    expect(
      getDisplayStatus(byId("demo-2"), { now: NOW, suggestions: [createDemoSuggestion("demo-2")] }),
    ).toBe("needs_review");
  });

  it("flags an unknown direction as needs_review (never silently assigned to the user)", () => {
    expect(getDisplayStatus({ ...byId("demo-3"), direction: "unknown" }, { now: NOW })).toBe(
      "needs_review",
    );
  });

  it("completed/dismissed win over everything", () => {
    expect(getDisplayStatus({ ...byId("demo-2"), status: "completed" }, { now: NOW })).toBe("completed");
    expect(getDisplayStatus({ ...byId("demo-5"), status: "dismissed" }, { now: NOW })).toBe("dismissed");
  });
});

describe("computeStats", () => {
  it("counts the dashboard headline numbers", () => {
    const list = [...demo, { ...byId("demo-6"), id: "done", status: "completed" as const }];
    const stats = computeStats(list, { now: NOW });
    expect(stats).toEqual({
      open: 6,
      youOwe: 3,
      theyOwe: 3,
      unknownDirection: 0,
      overdue: 2, // demo-2 (James, 2 days) + demo-4 (€20, 3 hours)
      needsReview: 1, // demo-5 low confidence
      completed: 1,
      dismissed: 0,
    });
  });
});

describe("filterCommitments", () => {
  it("filters by direction", () => {
    expect(filterCommitments(demo, { direction: "you_owe" }, { now: NOW })).toHaveLength(3);
    expect(filterCommitments(demo, { direction: "they_owe" }, { now: NOW })).toHaveLength(3);
  });

  it("filters by status, including derived statuses", () => {
    expect(filterCommitments(demo, { status: "overdue" }, { now: NOW }).map((c) => c.id).sort()).toEqual([
      "demo-2",
      "demo-4",
    ]);
    expect(filterCommitments(demo, { status: "needs_review" }, { now: NOW }).map((c) => c.id)).toEqual([
      "demo-5",
    ]);
    expect(filterCommitments(demo, { status: "open" }, { now: NOW })).toHaveLength(6);
    expect(filterCommitments(demo, { status: "completed" }, { now: NOW })).toHaveLength(0);
  });

  it("searches title, people and evidence (multi-term, case-insensitive)", () => {
    expect(filterCommitments(demo, { query: "sarah" }, { now: NOW }).length).toBeGreaterThanOrEqual(3);
    expect(filterCommitments(demo, { query: "API" }, { now: NOW }).map((c) => c.id)).toEqual(["demo-3"]);
    expect(filterCommitments(demo, { query: "james friday" }, { now: NOW }).map((c) => c.id)).toEqual([
      "demo-2",
    ]);
    expect(filterCommitments(demo, { query: "€20" }, { now: NOW }).map((c) => c.id)).toEqual(["demo-4"]);
  });
});

describe("sortByUrgency", () => {
  it("orders overdue → soonest → no deadline → closed", () => {
    const list = [{ ...byId("demo-1"), id: "closed", status: "completed" as const }, ...demo];
    const ids = sortByUrgency(list).map((c) => c.id);
    expect(ids.slice(0, 2)).toEqual(["demo-2", "demo-4"]);
    expect(ids.at(-1)).toBe("closed");
    expect(ids.indexOf("demo-3")).toBeGreaterThan(ids.indexOf("demo-6"));
  });
});

describe("counterpartyOf", () => {
  it("addresses the right person", () => {
    expect(counterpartyOf(byId("demo-3"))).toBe("Alex"); // they owe → promisor
    expect(counterpartyOf(byId("demo-1"))).toBe("Sarah"); // you owe → beneficiary
    expect(counterpartyOf({ ...byId("demo-1"), direction: "unknown" }, "Me")).toBe("Sarah");
  });
});
