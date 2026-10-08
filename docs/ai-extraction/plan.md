# Member 3 — AI extraction implementation plan

## Scope and source of truth

Work only on `feature/ai-extraction` in the shared Next.js application, based on `origin/main` at `902ca3c`. Do not merge to main, copy Member 2's importer, change the dashboard, implement storage, or redefine `src/types/openloop.ts`. The newer `PROJECT_BRIEF.md`, actual types, and Member 2's `MEMBER_3_HANDOFF.md` govern the integration (`source: "txt"`, not the older brief's `"text"`). No visual design changes are part of this backend slice.

## Implementation

- Implement `POST /api/commitments/extract` accepting `{ messages: Message[], currentUserLabel: string, referenceDate?: string }` and returning exactly `{ commitments: Commitment[] }`.
- Use server-only OpenAI-compatible chat completions with strict JSON-schema output. Default to `gpt-5-mini`, verified in the live catalog on 8 October 2026. Use `OPENAI_API_KEY`, optional `OPENAI_MODEL`, and optional `OPENAI_BASE_URL` (or the sandbox-compatible `OPENAI_API_BASE`). The default public provider base is `https://api.openai.com/v1`. No SDK/dependency or key is committed. Sandbox credentials are not deployment credentials.
- Model candidates contain action/evidence/recipient/deadline information. The server supplies IDs, pending status, the source sender as promisor, and identity-derived direction, rather than letting the model invent these authoritative fields.
- Validate requests, bounded streamed body size, message IDs, source enum, dates, and model structure. Reject fabricated evidence and invalid candidates with informative errors. Null unsupported deadlines; never use the server's current date or manufacture timezones.
- Use message timestamps before explicit reference dates. Resolve common relative days/weekdays deterministically; retain date-only meaning when timezone/time precision is unavailable.
- Deduplicate obvious repeated candidates within a request and expose a documented content-key helper for storage integration. No shared/global conversation persistence is added.
- Enforce provider timeout and a modest process-local concurrency ceiling. Return no-store JSON errors without private body or provider-secret logging. No hidden demo fallback or automatic messaging.

## Project structure

- `src/app/api/commitments/extract/route.ts`: HTTP entrypoint, body limits and public error envelope.
- `src/lib/ai/`: extraction prompt/schema, request/output validation, deadline handling, provider transport, service and content-key helper.
- `tests/ai-extraction/`: Node test runner with isolated TypeScript compilation, deterministic transport/route tests, synthetic live endpoint fixtures and explicit live smoke script.
- `docs/ai-extraction/`: plan, outcome checklist and integration handoff, including actual checks and deployment blockers.

## Current constraints

The sandbox model catalog and the coordinator's prior live probe confirm development connectivity only. Member 5 must configure and verify production secrets and call the deployed endpoint before claiming a public MVP. This task will not initialize a competing Manus app or publish anything. Managed edit diagnostics reported no active project; use the existing `npm run typecheck` (baseline passed), lint and production build instead.
