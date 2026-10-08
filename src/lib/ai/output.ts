import { createHash } from "node:crypto";
import type { Commitment, Confidence } from "@/types/openloop";
import { hasBeneficiaryEvidence } from "./beneficiary";
import { isIsoDeadline, supportedDeadline } from "./dates";
import { ExtractionError, invalidOutput } from "./errors";
import { identityKey, isRecord, isUnknownSender, LIMITS, type ExtractionRequest } from "./request";

function normalizeContent(value: string): string {
  return value.normalize("NFKC").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

/** Does not depend on newly generated import IDs, edited due dates, or saved status. */
export function commitmentContentKey(commitment: Pick<Commitment, "title" | "promisor" | "beneficiary" | "evidenceQuote">): string {
  const data = [commitment.promisor, commitment.beneficiary ?? "", commitment.evidenceQuote, commitment.title].map(normalizeContent);
  return `ol_${createHash("sha256").update(JSON.stringify(data)).digest("hex").slice(0, 32)}`;
}

function outputString(value: unknown, maxLength: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) invalidOutput();
  return value;
}

export function validateModelOutput(value: unknown, request: ExtractionRequest): Commitment[] {
  if (!isRecord(value) || Object.keys(value).length !== 1 || !Array.isArray(value.commitments)) invalidOutput();
  if (value.commitments.length > LIMITS.commitments) throw new ExtractionError("OUTPUT_TOO_LARGE", "Too many commitments for one analysis. Please split the conversation.", 502);
  const messages = new Map(request.messages.map((message) => [message.id, message]));
  const seen = new Set<string>();
  const commitments: Commitment[] = [];
  const fields = ["title", "beneficiary", "dueAt", "deadlineQuote", "evidenceQuote", "sourceMessageId", "confidence"];
  for (const candidate of value.commitments) {
    if (!isRecord(candidate) || Object.keys(candidate).length !== fields.length || fields.some((field) => !(field in candidate))) invalidOutput();
    const title = outputString(candidate.title, 300).trim();
    const sourceMessageId = outputString(candidate.sourceMessageId, 128);
    const source = messages.get(sourceMessageId);
    const evidenceQuote = outputString(candidate.evidenceQuote, LIMITS.textCharacters);
    if (!source || !source.text.includes(evidenceQuote)) invalidOutput();
    if (candidate.confidence !== "high" && candidate.confidence !== "medium" && candidate.confidence !== "low") invalidOutput();
    const confidence: Confidence = isUnknownSender(source.sender) ? "low" : candidate.confidence;
    let beneficiary: string | null = null;
    if (candidate.beneficiary !== null) {
      beneficiary = outputString(candidate.beneficiary, 200).trim();
      if (isUnknownSender(beneficiary)) beneficiary = null;
      else {
        if (!hasBeneficiaryEvidence(beneficiary, evidenceQuote, source, request.currentUserLabel, request.messages)) invalidOutput();
        if (identityKey(beneficiary) === identityKey(request.currentUserLabel)) beneficiary = request.currentUserLabel;
      }
    }
    if (candidate.dueAt !== null && (typeof candidate.dueAt !== "string" || !isIsoDeadline(candidate.dueAt))) invalidOutput();
    let deadlineQuote: string | null = null;
    if (candidate.deadlineQuote !== null) {
      deadlineQuote = outputString(candidate.deadlineQuote, 2000);
      if (!source.text.includes(deadlineQuote)) invalidOutput();
    }
    const dueAt = supportedDeadline(candidate.dueAt as string | null, deadlineQuote, source.text, source.sentAt, request.referenceDate);
    const promisor = source.sender;
    const direction = isUnknownSender(promisor) ? "unknown" : identityKey(promisor) === identityKey(request.currentUserLabel) ? "you_owe" : beneficiary && identityKey(beneficiary) === identityKey(request.currentUserLabel) ? "they_owe" : "unknown";
    const id = commitmentContentKey({ title, promisor, beneficiary, evidenceQuote });
    if (seen.has(id)) continue;
    seen.add(id);
    commitments.push({ id, title, promisor, beneficiary, direction, dueAt, evidenceQuote, sourceMessageId, confidence, status: "pending" });
  }
  return commitments;
}
