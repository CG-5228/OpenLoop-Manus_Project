/**
 * Browser helpers for follow-ups: call the API and copy the draft.
 * Copying is the only "send" path — OpenLoop never sends messages itself.
 */

import type { Commitment, FollowUpResponse, FollowUpTone } from "./types";

export const FOLLOW_UP_ENDPOINT = "/api/follow-up";

export class FollowUpRequestError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = "FollowUpRequestError";
  }
}

export interface RequestFollowUpOptions {
  currentUserLabel?: string;
  tone?: FollowUpTone;
  /**
   * Accept a labelled non-AI template when AI is unavailable (instead of an
   * error). Only set this if your UI shows `source`/`notice` to the user.
   */
  allowTemplate?: boolean;
  signal?: AbortSignal;
  /** Override for tests or a different deployment base path. */
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

export async function requestFollowUp(
  commitment: Commitment,
  opts: RequestFollowUpOptions = {},
): Promise<FollowUpResponse> {
  const doFetch = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await doFetch(opts.endpoint ?? FOLLOW_UP_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commitment,
        currentUserLabel: opts.currentUserLabel,
        tone: opts.tone,
        now: new Date().toISOString(),
        ...(opts.allowTemplate ? { allowTemplate: true } : {}),
      }),
      signal: opts.signal,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    throw new FollowUpRequestError("Network error — could not reach the follow-up service.", null);
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* handled below */
  }
  if (!res.ok) {
    const msg =
      data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Follow-up request failed (${res.status})`;
    throw new FollowUpRequestError(msg, res.status);
  }
  const d = data as Partial<FollowUpResponse> | null;
  if (!d || typeof d.message !== "string" || (d.source !== "ai" && d.source !== "template")) {
    throw new FollowUpRequestError("Unexpected response from the follow-up service.", res.status);
  }
  return {
    message: d.message,
    source: d.source,
    model: typeof d.model === "string" ? d.model : null,
    ...(typeof d.notice === "string" ? { notice: d.notice } : {}),
  };
}

/** Copy text to the clipboard, with a fallback for non-secure contexts. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  if (typeof document === "undefined") return false;
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}
