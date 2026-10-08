import { demoExtraction, getExtractionMode } from "../../../../lib/ai/demo-extractor";
import { handleExtractionRequest } from "../../../../lib/ai/http";

// Node.js is the shared application's default runtime. POST is never cached.
export const maxDuration = 90;

/**
 * AI extraction when a provider credential is configured; otherwise the
 * rule-based demo extractor. Both go through the same validation, and the
 * response header tells the UI which one produced the result.
 */
export async function POST(request: Request): Promise<Response> {
  const mode = getExtractionMode();
  const response = await handleExtractionRequest(request, mode === "demo" ? demoExtraction : undefined);
  response.headers.set("X-OpenLoop-Extraction", mode);
  return response;
}
