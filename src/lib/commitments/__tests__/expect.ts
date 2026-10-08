/**
 * Minimal `expect` for Module D tests, built on node:assert so the tests run
 * on Node's built-in runner (`node:test`) with no new dependencies:
 *
 *   npx -y tsx --test src/lib/commitments/__tests__/*.test.ts
 *
 * Supports only the matchers these tests use. Test-only; never imported by
 * app code.
 */

import { AssertionError } from "node:assert";
import { inspect, isDeepStrictEqual } from "node:util";

type ErrorMatcher = string | RegExp | (abstract new (...args: never[]) => Error);

interface Matchers {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toMatchObject(expected: object): void;
  toBeNull(): void;
  toBeUndefined(): void;
  toBeTruthy(): void;
  toContain(item: unknown): void;
  toMatch(pattern: RegExp | string): void;
  toHaveLength(length: number): void;
  toBeGreaterThan(n: number): void;
  toBeGreaterThanOrEqual(n: number): void;
  toBeLessThan(n: number): void;
  toThrow(expected?: ErrorMatcher): void;
  /** For node:test `mock.fn()` mocks. */
  toHaveBeenCalled(): void;
  toHaveBeenCalledTimes(n: number): void;
}

interface AsyncMatchers {
  toThrow(expected?: ErrorMatcher): Promise<void>;
}

export interface Expectation extends Matchers {
  not: Matchers;
  rejects: AsyncMatchers;
}

const fmt = (v: unknown) => inspect(v, { depth: 6, breakLength: 100 });

/** Deep equality that ignores `undefined`-valued properties (like Jest's toEqual). */
function stripUndefined(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stripUndefined);
  if (v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(v)
        .filter(([, x]) => x !== undefined)
        .map(([k, x]) => [k, stripUndefined(x)]),
    );
  }
  return v;
}

function isSubset(actual: unknown, expected: unknown): boolean {
  if (Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      actual.length === expected.length &&
      expected.every((e, i) => isSubset(actual[i], e))
    );
  }
  if (expected && typeof expected === "object") {
    if (!actual || typeof actual !== "object") return false;
    return Object.entries(expected).every(([k, e]) =>
      isSubset((actual as Record<string, unknown>)[k], e),
    );
  }
  return Object.is(actual, expected);
}

function errorMatches(err: unknown, expected: ErrorMatcher | undefined): boolean {
  if (expected === undefined) return true;
  const message = err instanceof Error ? err.message : String(err);
  if (typeof expected === "string") return message.includes(expected);
  if (expected instanceof RegExp) return expected.test(message);
  return err instanceof expected;
}

function callCount(fn: unknown): number {
  const m = (fn as { mock?: { callCount?: () => number } } | null)?.mock;
  if (!m || typeof m.callCount !== "function") {
    throw new TypeError("toHaveBeenCalled* expects a node:test mock.fn()");
  }
  return m.callCount();
}

function build(actual: unknown, negate: boolean): Matchers {
  const check = (pass: boolean, message: string) => {
    if (pass === negate) {
      throw new AssertionError({ message: negate ? `Expected NOT: ${message}` : message });
    }
  };
  return {
    toBe: (e) => check(Object.is(actual, e), `expected ${fmt(actual)} to be ${fmt(e)}`),
    toEqual: (e) =>
      check(
        isDeepStrictEqual(stripUndefined(actual), stripUndefined(e)),
        `expected ${fmt(actual)} to equal ${fmt(e)}`,
      ),
    toMatchObject: (e) => check(isSubset(actual, e), `expected ${fmt(actual)} to match ${fmt(e)}`),
    toBeNull: () => check(actual === null, `expected ${fmt(actual)} to be null`),
    toBeUndefined: () => check(actual === undefined, `expected ${fmt(actual)} to be undefined`),
    toBeTruthy: () => check(Boolean(actual), `expected ${fmt(actual)} to be truthy`),
    toContain: (item) =>
      check(
        (typeof actual === "string" && typeof item === "string" && actual.includes(item)) ||
          (Array.isArray(actual) && actual.includes(item)),
        `expected ${fmt(actual)} to contain ${fmt(item)}`,
      ),
    toMatch: (p) =>
      check(
        typeof actual === "string" && (typeof p === "string" ? actual.includes(p) : p.test(actual)),
        `expected ${fmt(actual)} to match ${fmt(p)}`,
      ),
    toHaveLength: (n) =>
      check(
        (actual as { length?: unknown } | null)?.length === n,
        `expected length ${fmt((actual as { length?: unknown } | null)?.length)} to be ${n}`,
      ),
    toBeGreaterThan: (n) => check(typeof actual === "number" && actual > n, `expected ${fmt(actual)} > ${n}`),
    toBeGreaterThanOrEqual: (n) =>
      check(typeof actual === "number" && actual >= n, `expected ${fmt(actual)} >= ${n}`),
    toBeLessThan: (n) => check(typeof actual === "number" && actual < n, `expected ${fmt(actual)} < ${n}`),
    toThrow: (expected) => {
      if (typeof actual !== "function") throw new TypeError("toThrow expects a function");
      let threw = false;
      let error: unknown;
      try {
        (actual as () => unknown)();
      } catch (err) {
        threw = true;
        error = err;
      }
      check(
        threw && errorMatches(error, expected),
        threw
          ? `expected thrown ${fmt(error)} to match ${fmt(expected)}`
          : "expected function to throw",
      );
    },
    toHaveBeenCalled: () => check(callCount(actual) > 0, "expected mock to have been called"),
    toHaveBeenCalledTimes: (n) =>
      check(callCount(actual) === n, `expected ${callCount(actual)} calls to be ${n}`),
  };
}

export function expect(actual: unknown): Expectation {
  return {
    ...build(actual, false),
    not: build(actual, true),
    rejects: {
      async toThrow(expected) {
        let error: unknown;
        try {
          await actual;
        } catch (err) {
          error = err ?? new Error("rejected");
        }
        if (error === undefined) throw new AssertionError({ message: "expected promise to reject" });
        if (!errorMatches(error, expected)) {
          throw new AssertionError({
            message: `expected rejection ${fmt(error)} to match ${fmt(expected)}`,
          });
        }
      },
    },
  };
}
