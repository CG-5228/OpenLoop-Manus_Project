/**
 * Duplicate detection (BRIEF Test 7: importing the same conversation twice
 * must not create obvious duplicates).
 *
 * Message and commitment ids are usually regenerated on every import, so ids
 * alone cannot detect duplicates. Two commitments are treated as the same
 * when EITHER:
 *   1. same promisor + same evidence quote (normalised) — the quote is copied
 *      verbatim from the conversation, so it is the strongest signal; or
 *   2. same promisor + beneficiary + title + deadline (normalised) — catches
 *      re-extractions where the quote boundaries differ slightly.
 */

import type { Commitment, CompletionSuggestion } from "./types";

/** Lowercase, unify quotes/dashes, strip punctuation, collapse whitespace. */
export function normalizeText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201F\u2033]/g, '"')
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function evidenceFingerprint(c: Pick<Commitment, "promisor" | "evidenceQuote">): string {
  return `q|${normalizeText(c.promisor)}|${normalizeText(c.evidenceQuote)}`;
}

export function titleFingerprint(
  c: Pick<Commitment, "promisor" | "beneficiary" | "title" | "dueAt">,
): string {
  const due = c.dueAt ? c.dueAt.slice(0, 10) : "none";
  return `t|${normalizeText(c.promisor)}|${normalizeText(c.beneficiary)}|${normalizeText(
    c.title,
  )}|${due}`;
}

export function commitmentFingerprints(c: Commitment): string[] {
  return [evidenceFingerprint(c), titleFingerprint(c)];
}

/** Index of fingerprints → existing commitment id. */
export class FingerprintIndex {
  private map = new Map<string, string>();

  constructor(commitments: Iterable<Commitment> = []) {
    for (const c of commitments) this.add(c);
  }

  add(c: Commitment): void {
    for (const fp of commitmentFingerprints(c)) {
      if (!this.map.has(fp)) this.map.set(fp, c.id);
    }
  }

  /** Id of an existing commitment that duplicates `c`, if any. */
  findDuplicate(c: Commitment): string | null {
    for (const fp of commitmentFingerprints(c)) {
      const hit = this.map.get(fp);
      if (hit) return hit;
    }
    return null;
  }
}

/** Stable key for a completion suggestion (survives re-imported message ids). */
export function suggestionKey(s: Pick<CompletionSuggestion, "commitmentId" | "evidenceQuote">): string {
  return `${s.commitmentId}|${normalizeText(s.evidenceQuote)}`;
}
