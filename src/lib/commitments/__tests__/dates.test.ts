import { describe, it } from "node:test";
import { expect } from "./expect";
import {
  describeCommitmentDeadline,
  describeDeadline,
  getDueState,
  InvalidDeadlineError,
  isOverdue,
  normalizeDeadlineInput,
  parseDueDate,
  toDateTimeLocalValue,
} from "../dates";

// Local-time "now": Thu 8 Oct 2026, 12:00
const now = new Date(2026, 9, 8, 12, 0, 0);

describe("parseDueDate", () => {
  it("returns null for missing deadlines (never invents one)", () => {
    expect(parseDueDate(null)).toBeNull();
    expect(parseDueDate(undefined)).toBeNull();
    expect(parseDueDate("")).toBeNull();
    expect(parseDueDate("tomorrow")).toBeNull();
  });

  it("treats date-only values as end of that local day", () => {
    const d = parseDueDate("2026-10-08")!;
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
    expect(d.getDate()).toBe(8);
  });

  it("rejects impossible calendar dates", () => {
    expect(parseDueDate("2026-02-31")).toBeNull();
  });

  it("parses full ISO timestamps", () => {
    expect(parseDueDate("2026-10-09T17:00:00.000Z")!.toISOString()).toBe("2026-10-09T17:00:00.000Z");
  });
});

describe("normalizeDeadlineInput", () => {
  it("normalises to full ISO", () => {
    expect(normalizeDeadlineInput("2026-10-09T17:00:00Z")).toBe("2026-10-09T17:00:00.000Z");
    expect(normalizeDeadlineInput("2026-10-09T17:00")).toBe(new Date(2026, 9, 9, 17, 0).toISOString());
    expect(normalizeDeadlineInput(new Date(2026, 9, 9, 17, 0))).toBe(new Date(2026, 9, 9, 17, 0).toISOString());
  });

  it("clears with null or empty string", () => {
    expect(normalizeDeadlineInput(null)).toBeNull();
    expect(normalizeDeadlineInput("  ")).toBeNull();
  });

  it("throws on garbage instead of silently dropping it", () => {
    expect(() => normalizeDeadlineInput("next friday")).toThrow(InvalidDeadlineError);
  });
});

describe("isOverdue", () => {
  it("is true only for pending items past their deadline", () => {
    const past = new Date(2026, 9, 7, 9, 0).toISOString();
    expect(isOverdue({ dueAt: past, status: "pending" }, now)).toBe(true);
    expect(isOverdue({ dueAt: past, status: "completed" }, now)).toBe(false);
    expect(isOverdue({ dueAt: past, status: "dismissed" }, now)).toBe(false);
    expect(isOverdue({ dueAt: null, status: "pending" }, now)).toBe(false);
  });

  it("a date-only deadline for today is not yet overdue", () => {
    expect(isOverdue({ dueAt: "2026-10-08", status: "pending" }, now)).toBe(false);
    expect(isOverdue({ dueAt: "2026-10-07", status: "pending" }, now)).toBe(true);
  });
});

describe("getDueState / describeDeadline", () => {
  it("buckets deadlines", () => {
    expect(getDueState(null, now)).toBe("none");
    expect(getDueState(new Date(2026, 9, 8, 9).toISOString(), now)).toBe("overdue");
    expect(getDueState(new Date(2026, 9, 8, 18).toISOString(), now)).toBe("due_today");
    expect(getDueState(new Date(2026, 9, 9, 18).toISOString(), now)).toBe("due_soon");
    expect(getDueState(new Date(2026, 9, 20).toISOString(), now)).toBe("upcoming");
  });

  it("describes deadlines in plain language", () => {
    expect(describeDeadline(null, now)).toBe("No deadline");
    expect(describeDeadline(new Date(2026, 9, 8, 7).toISOString(), now)).toBe("Overdue by 5 hours");
    expect(describeDeadline(new Date(2026, 9, 6, 12).toISOString(), now)).toBe("Overdue by 2 days");
    expect(describeDeadline("2026-10-08", now)).toBe("Due today");
    expect(describeDeadline("2026-10-09", now)).toBe("Due tomorrow");
    expect(describeDeadline("2026-10-11", now)).toBe("Due in 3 days");
    expect(describeDeadline("2026-10-30", now)).toMatch(/^Due /);
  });
});

describe("toDateTimeLocalValue", () => {
  it("round-trips with normalizeDeadlineInput", () => {
    const iso = normalizeDeadlineInput("2026-10-09T17:30")!;
    expect(toDateTimeLocalValue(iso)).toBe("2026-10-09T17:30");
    expect(toDateTimeLocalValue(null)).toBe("");
  });
});

describe("describeCommitmentDeadline", () => {
  it("never labels closed commitments as overdue", () => {
    const past = new Date(2026, 9, 6, 17, 0).toISOString();
    expect(describeCommitmentDeadline({ dueAt: past, status: "pending" }, now)).toMatch(/^Overdue/);
    expect(describeCommitmentDeadline({ dueAt: past, status: "completed" }, now)).toMatch(/^Due /);
    expect(describeCommitmentDeadline({ dueAt: past, status: "dismissed" }, now)).not.toMatch(/Overdue/);
    expect(describeCommitmentDeadline({ dueAt: null, status: "completed" }, now)).toBe("No deadline");
  });
});
