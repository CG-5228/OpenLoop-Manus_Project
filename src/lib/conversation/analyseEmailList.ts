import type { Commitment } from "../../types/openloop";
import { emailIdsWithCommitments, emailToMessage, type EmailRecord } from "./emailList";
import { requestCommitments } from "./requestCommitments";

export const MAX_AI_EMAILS = 10;
export interface EmailAnalysis {
  emailId: string;
  commitments: Commitment[];
  error: string | null;
}
export interface AnalyseEmailOptions {
  currentUserLabel: string;
  referenceDate?: string;
  signal?: AbortSignal;
  onProgress?: (completed: number, total: number) => void;
}

/** Each email is independent; no unrelated email supplies acceptance or fulfilment context. */
export async function analyseEmailList(
  emails: EmailRecord[],
  options: AnalyseEmailOptions,
  request: typeof requestCommitments = requestCommitments,
): Promise<EmailAnalysis[]> {
  if (!emails.length) throw new Error("Choose at least one visible email.");
  if (emails.length > MAX_AI_EMAILS) throw new Error("Analyse up to 10 emails at a time. Narrow the filters or selection first.");
  if (!options.currentUserLabel.trim()) throw new Error("Enter your own name or email label first.");
  const results = new Array<EmailAnalysis>(emails.length);
  let next = 0;
  let completed = 0;
  async function worker() {
    while (next < emails.length) {
      options.signal?.throwIfAborted();
      const index = next++;
      const email = emails[index];
      try {
        const commitments = await request({
          messages: [emailToMessage(email)],
          currentUserLabel: options.currentUserLabel.trim(),
          ...(options.referenceDate ? { referenceDate: options.referenceDate } : {}),
        }, options.signal);
        emailIdsWithCommitments([email], commitments);
        results[index] = { emailId: email.id, commitments, error: null };
      } catch (cause) {
        options.signal?.throwIfAborted();
        results[index] = { emailId: email.id, commitments: [], error: cause instanceof Error && cause.message.trim() ? cause.message : "This email could not be analysed." };
      }
      completed += 1;
      options.onProgress?.(completed, emails.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(2, emails.length) }, () => worker()));
  options.signal?.throwIfAborted();
  return results;
}
