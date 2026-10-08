import { handleExtractionRequest } from "../../../../lib/ai/http";

// Node.js is the shared application's default runtime. POST is never cached.
export const maxDuration = 90;

export async function POST(request: Request): Promise<Response> {
  return handleExtractionRequest(request);
}
