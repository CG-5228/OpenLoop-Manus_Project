/**
 * Thin, typed clients for the team's documented API contracts (README →
 * "API contracts"). Member 1 only *calls* these endpoints from the UI; the
 * route handlers themselves are owned by:
 *
 *   POST /api/commitments/extract  → Member 3 (AI extraction)
 *   POST /api/follow-up            → Member 4 (commitment management)
 *
 * Failures surface as `ApiError` with a user-facing message. Callers must show
 * the error — never substitute fixture data for a failed live request.
 */
import type { FollowUpDraft } from "@/lib/ui/dashboard-data-api";
import type { Commitment, Message } from "@/types/openloop";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return (await postJsonWithHeaders<T>(url, body, signal)).data;
}

async function postJsonWithHeaders<T>(
  url: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<{ data: T; headers: Headers }> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiError("We couldn't reach OpenLoop's servers. Check your connection and try again.", 0);
  }

  if (!res.ok) {
    let detail: string | undefined;
    try {
      const data = (await res.json()) as { error?: unknown; message?: unknown };
      const raw = data.error ?? data.message;
      if (typeof raw === "string") detail = raw;
      else if (raw && typeof raw === "object" && "message" in raw && typeof raw.message === "string") {
        detail = raw.message;
      }
    } catch {
      /* non-JSON error body */
    }
    if (res.status === 404) {
      throw new ApiError("This service isn't available yet. Please try again later.", 404);
    }
    throw new ApiError(detail ?? `The request failed (${res.status}). Please try again.`, res.status);
  }
  return { data: (await res.json()) as T, headers: res.headers };
}

export interface ExtractRequest {
  messages: Message[];
  currentUserLabel: string;
  referenceDate?: string;
}

/** "ai" = language-model extraction; "demo" = rule-based demo extraction (no AI provider configured). */
export type ExtractionMode = "ai" | "demo";

export async function extractCommitments(req: ExtractRequest, signal?: AbortSignal) {
  const { data, headers } = await postJsonWithHeaders<{ commitments?: unknown }>(
    "/api/commitments/extract",
    req,
    signal,
  );
  if (!Array.isArray(data.commitments)) {
    throw new ApiError("The analysis returned an unexpected response.", 502);
  }
  const mode: ExtractionMode = headers.get("X-OpenLoop-Extraction") === "ai" ? "ai" : "demo";
  return { commitments: data.commitments as Commitment[], mode };
}

export async function requestFollowUp(
  commitment: Commitment,
  tone: "casual" | "polite" | "firm" = "casual",
  signal?: AbortSignal,
) {
  // allowTemplate: when AI is unavailable (e.g. no key in a demo deployment), the
  // server returns a labelled template draft instead of failing.
  const data = await postJson<{ message?: unknown; source?: unknown }>(
    "/api/follow-up",
    { commitment, tone, allowTemplate: true },
    signal,
  );
  if (typeof data.message !== "string" || !data.message.trim()) {
    throw new ApiError("The follow-up service returned an empty draft.", 502);
  }
  return { message: data.message, source: data.source === "ai" ? "ai" : "template" } satisfies FollowUpDraft;
}
