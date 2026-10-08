import type { Message } from "@/types/openloop";
import { identityKey, isUnknownSender } from "./request";

function hasName(text: string, name: string): boolean {
  const escaped = identityKey(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escaped}(?:$|[^\\p{L}\\p{N}_])`, "u").test(identityKey(text));
}

/** Model inference is still needed for semantics; this prevents unsupported name/substr injection. */
export function hasBeneficiaryEvidence(
  beneficiary: string,
  evidenceQuote: string,
  source: Message,
  currentUserLabel: string,
  messages: Message[],
): boolean {
  if (hasName(evidenceQuote, beneficiary)) return true;
  const inConversation = messages.filter((message) => message.conversationId === source.conversationId);
  const sourceIndex = inConversation.findIndex((message) => message.id === source.id);
  const previous = inConversation[sourceIndex - 1];
  // An immediately preceding explicit request to "you" for "me/my", accepted in the source.
  if (previous && !isUnknownSender(previous.sender) && identityKey(previous.sender) === identityKey(beneficiary)
    && /\b(can|could|would|will)\s+you\b/i.test(previous.text) && /\b(me|my)\b/i.test(previous.text)
    && /^(yes|sure|okay|ok|agreed|of course)\b/i.test(evidenceQuote.trim())) return true;
  if (identityKey(beneficiary) !== identityKey(currentUserLabel)) return false;
  // Direct "you" is only useful for another sender's promise. Don't map the user's "you" to self.
  if (isUnknownSender(source.sender) || identityKey(source.sender) === identityKey(currentUserLabel)) return false;
  const directRecipient = /\b(send|email|give|pay|lend|bring|get|show|forward|transfer|owe|call|help|contact|message|text|refund)\s+you\b|\b(to|for|with)\s+you\b/i;
  if (!directRecipient.test(evidenceQuote)) return false;
  // A named addressee/recipient in the same clause makes bare "you" ambiguous.
  const otherNames = inConversation
    .map((message) => message.sender)
    .filter((name) => !isUnknownSender(name) && identityKey(name) !== identityKey(source.sender) && identityKey(name) !== identityKey(currentUserLabel));
  return !otherNames.some((name) => hasName(evidenceQuote, name));
}
