import { readBoundedText } from "./body";
import { ExtractionError } from "./errors";
import { validateModelOutput } from "./output";
import { callExtractionModel } from "./provider";
import { LIMITS, validateExtractionRequest, type ExtractionRequest } from "./request";

export type ModelCall = (request: ExtractionRequest) => Promise<unknown>;
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 4;

function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export async function handleExtractionRequest(request: Request, model: ModelCall = callExtractionModel): Promise<Response> {
  let acquiredSlot = false;
  try {
    const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    if (contentType !== "application/json") throw new ExtractionError("UNSUPPORTED_MEDIA_TYPE", "Send the request as application/json.", 415);
    const contentLength = request.headers.get("content-length");
    if (contentLength && Number(contentLength) > LIMITS.bodyBytes) throw new ExtractionError("INPUT_TOO_LARGE", "The analysis request must be at most 1 MiB.", 413);
    let payload: unknown;
    try {
      const text = await readBoundedText(request.body, LIMITS.bodyBytes, new ExtractionError("INPUT_TOO_LARGE", "The analysis request must be at most 1 MiB.", 413));
      payload = JSON.parse(text);
    } catch (error) {
      if (error instanceof ExtractionError) throw error;
      throw new ExtractionError("INVALID_JSON", "The request body must contain valid UTF-8 JSON.", 400);
    }
    const validated = validateExtractionRequest(payload);
    if (activeRequests >= MAX_CONCURRENT_REQUESTS) throw new ExtractionError("AI_BUSY", "AI analysis is busy. Please try again shortly.", 503);
    activeRequests += 1;
    acquiredSlot = true;
    const candidates = await model(validated);
    return json({ commitments: validateModelOutput(candidates, validated) });
  } catch (error) {
    if (error instanceof ExtractionError) return json({ error: { code: error.code, message: error.message } }, error.status);
    // Do not expose/log conversation content, credentials, URLs or raw provider errors.
    return json({ error: { code: "INTERNAL_ERROR", message: "Analysis could not finish. Please try again." } }, 500);
  } finally {
    if (acquiredSlot) activeRequests -= 1;
  }
}
