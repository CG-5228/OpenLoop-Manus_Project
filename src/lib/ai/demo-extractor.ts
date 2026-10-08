/**
 * Demo extraction (no AI provider configured).
 *
 * OpenLoop's real extraction calls a language model (see ./provider.ts). When the
 * deployment has no provider credential, the route uses this rule-based extractor
 * instead so the product remains fully usable as a demo.
 *
 * It is honest by construction:
 *  - It reads the conversation the user actually submitted (no fixtures).
 *  - It emits candidates in the model's exact output schema, which then go through
 *    the same server validation as AI output (exact evidence, beneficiary proof,
 *    deadline normalisation, direction, content-based IDs).
 *  - The route marks responses with `X-OpenLoop-Extraction: demo` and the UI labels
 *    results as demo extraction.
 *
 * Coverage is deliberately conservative: explicit first-person promises
 * ("I'll…", "I will…", "I promise to…", "I'm going to…") and short acceptances of a
 * direct request ("Sure, will do"). Hedged, conditional, negated and question
 * sentences are skipped.
 */
import type { Message } from "@/types/openloop";
import { hasBeneficiaryEvidence } from "./beneficiary";
import { validateModelOutput } from "./output";
import { identityKey, isUnknownSender, LIMITS, type ExtractionRequest } from "./request";

export type ExtractionMode = "ai" | "demo";

/** `OPENLOOP_EXTRACTION_MODE=ai|demo` forces a mode; otherwise AI runs only when a key exists. */
export function getExtractionMode(env: NodeJS.ProcessEnv = process.env): ExtractionMode {
  const forced = env.OPENLOOP_EXTRACTION_MODE?.trim().toLowerCase();
  if (forced === "ai" || forced === "demo") return forced;
  return env.OPENAI_API_KEY?.trim() ? "ai" : "demo";
}

interface Candidate {
  title: string;
  beneficiary: string | null;
  dueAt: string | null;
  deadlineQuote: string | null;
  evidenceQuote: string;
  sourceMessageId: string;
  confidence: "high" | "medium" | "low";
}

const PROMISE = /\b(?:i['’]ll|i will|i['’]m going to|i am going to|i promise(?: to)?|i['’]m gonna)\s+/i;
const ACCEPTANCE = /^(?:yes|yep|yeah|sure|ok(?:ay)?|of course|definitely|absolutely|no problem)\b[\s,!.]*(?:(?:i['’]ll|i will) do (?:it|that)|will do|i can do that|i['’]m on it|consider it done)?[\s!.]*$/i;
const HEDGE = /\b(?:might|maybe|perhaps|possibly|probably|try(?:ing)? to|hopefully|if|unless|could|would|should|i guess|not sure)\b/i;
const NEGATION = /\b(?:not|never|won['’]t|can['’]t|cannot|don['’]t|didn['’]t)\b/i;

const DAY =
  "(?:today|tonight|this (?:morning|afternoon|evening|week)|tomorrow(?: (?:morning|afternoon|evening|night))?|the day after tomorrow|day after tomorrow|(?:this |next )?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|end of (?:the )?(?:day|week|month)|next week|\\d{4}-\\d{2}-\\d{2}|in \\d{1,3} days?)";
const TIME = "(?:(?:at |by )?\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)?\\s+)";
const DEADLINE = new RegExp(`\\b(?:(?:by|before|on|until|no later than|first thing)\\s+)?${TIME}?${DAY}\\b`, "i");

const RECIPIENT_WORDS = new Set([
  "send", "email", "give", "pay", "transfer", "text", "call", "message", "tell", "show", "lend",
  "bring", "forward", "remind", "ping", "refund", "update", "invoice", "to", "for", "with", "back",
]);
const NOT_NAMES = new Set([
  "i", "i'll", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "january", "february", "march", "april", "may", "june", "july", "august", "september",
  "october", "november", "december", "today", "tonight", "tomorrow", "api", "cv", "pdf",
]);

/** Sentence-like clauses, each an exact substring of the message text. */
function clauses(text: string): string[] {
  const sentences = text.match(/(?:[^.!?\n]|\.(?=\d))+[.!?]*/g) ?? [];
  return sentences
    .flatMap((s) => s.split(/\s+(?:and|then|also|plus)\s+(?=i['’]ll\b|i will\b)/i))
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && text.includes(s));
}

function capitalise(value: string) {
  return value.charAt(0).toLocaleUpperCase("en") + value.slice(1);
}

/** Capitalised words directly after a recipient verb or preposition ("send Sarah", "to James"). */
function namedRecipients(clause: string): string[] {
  const words = clause.split(/\s+/);
  const names: string[] = [];
  for (let i = 1; i < words.length; i++) {
    const prev = words[i - 1].toLowerCase().replace(/[^a-z']/g, "");
    const word = words[i].replace(/^[^\p{L}]+|[^\p{L}'’-]+$/gu, "").replace(/['’]s$/u, "");
    if (!word || !/^\p{Lu}/u.test(word) || NOT_NAMES.has(word.toLowerCase())) continue;
    if (RECIPIENT_WORDS.has(prev)) names.push(word);
  }
  return names;
}

function pickBeneficiary(
  clause: string,
  source: Message,
  request: ExtractionRequest,
  conversation: Message[],
): string | null {
  const promisorIsUser = identityKey(source.sender) === identityKey(request.currentUserLabel);
  const others = [...new Set(conversation.map((m) => m.sender))].filter(
    (s) => !isUnknownSender(s) && identityKey(s) !== identityKey(source.sender),
  );
  const options = [
    ...namedRecipients(clause),
    ...(promisorIsUser ? [] : [request.currentUserLabel]),
    ...others,
  ];
  const seen = new Set<string>();
  for (const option of options) {
    const key = identityKey(option);
    if (seen.has(key)) continue;
    seen.add(key);
    if (hasBeneficiaryEvidence(option, clause, source, request.currentUserLabel, request.messages)) {
      return option;
    }
  }
  return null;
}

function titleFrom(
  action: string,
  deadlineQuote: string | null,
  promisorIsUser: boolean,
  beneficiary: string | null,
  soleOther: string | null = null,
) {
  let rest = action;
  if (deadlineQuote) rest = rest.replace(deadlineQuote, " ");
  rest = rest
    .replace(/^\s*(?:definitely|also|just|totally|absolutely|make sure to|make sure i)\s+/i, "")
    .replace(/\s+(?:by|before|on|at|until|for)\s*([,.;:!?]|$)/i, "$1")
    .replace(/[\s,;:]+(?:i promise|promise|ok|okay|thanks|lol|haha)[\s!.]*$/i, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/[\s,;:.!?…—–-]+$/u, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (promisorIsUser) {
    // "you" in the user's own promise is the recipient: the named beneficiary, or the
    // only other person in a one-to-one conversation.
    const recipient = beneficiary ?? soleOther;
    if (recipient) rest = rest.replace(/\byou\b/i, recipient);
  } else {
    rest = rest.replace(/\s+(?:to|for|with)\s+you\b/gi, "").replace(/\byou\s+/i, "");
  }
  rest = rest.replace(/\bme\b/i, promisorIsUser ? "me" : "you").trim();
  if (rest.split(/\s+/).length < 2 && !/\p{L}{3,}/u.test(rest)) return null;
  return rest ? capitalise(rest).slice(0, 140) : null;
}

/** Turn "Can you send me the deck by Friday?" into the requested action. */
function requestedAction(text: string): string | null {
  const m = /\b(?:can|could|would|will)\s+you\s+(?:please\s+)?([^?]+)\?/i.exec(text);
  return m ? m[1].trim() : null;
}

export function demoCandidates(request: ExtractionRequest): Candidate[] {
  const out: Candidate[] = [];
  const byConversation = new Map<string, Message[]>();
  for (const m of request.messages) {
    byConversation.set(m.conversationId, [...(byConversation.get(m.conversationId) ?? []), m]);
  }

  for (const [, conversation] of byConversation) {
    conversation.forEach((source, index) => {
      if (isUnknownSender(source.sender)) return;
      const promisorIsUser = identityKey(source.sender) === identityKey(request.currentUserLabel);
      const participants = [...new Set(conversation.map((m) => identityKey(m.sender)))];
      const soleOther =
        participants.length === 2
          ? (conversation.find((m) => identityKey(m.sender) !== identityKey(source.sender))?.sender ?? null)
          : null;

      for (const clause of clauses(source.text)) {
        if (clause.endsWith("?") || HEDGE.test(clause) || NEGATION.test(clause)) continue;

        // 1) Explicit first-person promise.
        const promise = PROMISE.exec(clause);
        if (promise) {
          const deadlineQuote = DEADLINE.exec(clause)?.[0] ?? null;
          const beneficiary = pickBeneficiary(clause, source, request, conversation);
          const action = clause.slice(promise.index + promise[0].length);
          const title = titleFrom(action, deadlineQuote, promisorIsUser, beneficiary, soleOther);
          if (!title) continue;
          const partiesClear = promisorIsUser ? beneficiary !== null : beneficiary !== null;
          out.push({
            title,
            beneficiary,
            dueAt: null,
            deadlineQuote,
            evidenceQuote: clause,
            sourceMessageId: source.id,
            confidence: partiesClear ? "high" : "medium",
          });
          continue;
        }

        // 2) Short acceptance of the previous sender's direct request.
        const previous = conversation[index - 1];
        if (!previous || identityKey(previous.sender) === identityKey(source.sender)) continue;
        if (!ACCEPTANCE.test(clause)) continue;
        const asked = requestedAction(previous.text);
        if (!asked) continue;
        const beneficiary = hasBeneficiaryEvidence(previous.sender, clause, source, request.currentUserLabel, request.messages)
          ? previous.sender
          : null;
        let title = asked.replace(DEADLINE, " ");
        title = title.replace(/\bme\b/i, beneficiary ?? "them").replace(/\bmy\b/i, beneficiary ? `${beneficiary}'s` : "their");
        title = titleFrom(title, null, true, null) ?? "";
        if (!title) continue;
        out.push({
          title,
          beneficiary,
          dueAt: null,
          deadlineQuote: null,
          evidenceQuote: clause,
          sourceMessageId: source.id,
          confidence: "medium",
        });
      }
    });
  }
  return out.slice(0, LIMITS.commitments);
}

/** A `ModelCall` for `handleExtractionRequest`: keeps only candidates the shared validator accepts. */
export async function demoExtraction(request: ExtractionRequest): Promise<unknown> {
  const accepted = demoCandidates(request).filter((candidate) => {
    try {
      validateModelOutput({ commitments: [candidate] }, request);
      return true;
    } catch {
      return false;
    }
  });
  return { commitments: accepted };
}
