# OpenLoop — Member 3 extraction handoff

**Owner:** Member 3 — AI Commitment Extraction

**Branch:** `feature/ai-extraction`

**Baseline:** `origin/main` at `902ca3c02d42bd2330d715f06dc07737b4e1d812`

**Snapshot:** 8 October 2026

**Repository:** [CG-5228/OpenLoop-Manus_Project](https://github.com/CG-5228/OpenLoop-Manus_Project)

> **The real extraction endpoint is implemented and verified in the development environment. It has not been merged to main, integrated into the full application, or verified in a production deployment.**

## Delivered slice

`POST /api/commitments/extract` accepts `{ messages: Message[], currentUserLabel: string, referenceDate?: string }` and returns exactly `{ commitments: Commitment[] }`. It uses the existing shared source/type contract (`txt`, not `text`) and calls real server-side `gpt-5-mini` inference with strict structured output. The fictional sample and newly submitted input use the same endpoint; there is no fixture fallback.

The model extracts title, beneficiary, exact source evidence, confidence and deadline evidence. The server validates these, supplies the source sender as promisor, derives You Owe/They Owe/unknown direction, sets pending status, normalizes defensible deadlines and creates content-based IDs. Unsupported source IDs, quotations, recipient evidence or enum/date/field values fail honestly. Limits cover request bytes, message count/characters, provider-response bytes, output count, timeout and process-local concurrency.

The slice is confined to the extraction route, `src/lib/ai/`, `tests/ai-extraction/` and `docs/ai-extraction/`. It changes no canonical types, app page/layout, importer, OCR, persistence or other member's branch. The coordinator's newer branch changes were inspected without merging them; no overlap with its observed documentation-only changes was introduced.

## Verified evidence

| Check | Measured result |
| --- | --- |
| Deterministic route/validation/date/provider suite | **46 passed, 0 failed**; these include explicit transport mocks and are not called live inference. |
| Real endpoint/model smoke suite | **10 passed, 0 failed**, rerun after recipient-evidence hardening. |
| Shared sample | Four definite commitments: two You Owe, two They Owe; Sarah's “might” excluded. |
| Sample dates | Slides date `2026-10-08`; James report and Sam payment `2026-10-09`; Alex API key deadline null. |
| Novel/custom input | New promises, named month and literal ISO dates, correct directions, exact evidence. |
| Negative/context cases | No-promises/questions/hypotheses/negations, unanchored tomorrow, third-party beneficiary, timestamp priority across a year boundary, two actions, already fulfilled act, conversation injection and repeated messages all passed live assertions. |
| Lint / TypeScript / production build | `npm run check` passed; build includes dynamic `POST /api/commitments/extract`. |
| Independent read-only review | Direction-validator gap found, fixed, and independently rechecked; 46 tests passed and no new concrete defect found in the focused follow-up. |
| Temporary public development URL | API reachable; malformed/empty request returned the documented 400 JSON error. This is not a production-inference claim. |
| Scope/secret checks | Staged paths restricted to Member 3; known credential values absent from staged diff; shared contracts untouched. |

Final live scenario latencies were approximately **3.7–19.5 seconds** in this sandbox run; the shared sample took about 19.5 seconds. These are observations, not production performance guarantees. Server inference times out at 60 seconds. Live tests cover one run per scenario, not a statistical accuracy guarantee.

Two compatibility issues were corrected during validation: this provider rejected nullable `type` arrays, so the strict schema uses `anyOf`; and the shared Next.js cache-components configuration disallows route `runtime`/`dynamic` flags, so the route uses its default Node runtime and uncached POST behavior. Shared Next.js configuration was not changed.

## Required deployment configuration — Member 5

| Name | Use |
| --- | --- |
| `OPENAI_API_KEY` | Required server-only provider secret; no key value is in GitHub. |
| `OPENAI_MODEL` | Optional, tested default `gpt-5-mini`. |
| `OPENAI_BASE_URL` | Optional HTTPS OpenAI-compatible base, including `/v1`; default is `https://api.openai.com/v1`. |
| `OPENAI_API_BASE` | Lower-priority compatibility alias for the configured sandbox. |

**Production credentials/provider access remain unverified.** Do not assume sandbox environment variables transfer to hosting, or that a public URL opening proves live inference. Member 5 must configure the actual hosting secrets, verify supported structured-output/model behavior, and run the sample/custom smoke against that server. No secret is required for `next build`. There is no new authentication, database, platform integration or deployment in this branch.

## Integration actions

Member 1's current `feature/frontend` API client already accepts the success shape and can display the `{ error: { code, message } }` envelope; this was confirmed by source inspection, not an end-to-end browser test. Member 1/5 should connect Member 2's awaited `onImport` callback to this endpoint, then pass results to Member 4's storage/dashboard flow. Member 2's parser, explicit user identity and reference date are preserved; OCR is not required for the P0 text flow.

Member 4 should upsert/dedupe returned IDs while preserving prior completed/dismissed statuses and user-edited deadlines. IDs exclude fresh source/conversation IDs, saved status and edited deadlines. They depend on title and exact evidence, so AI rephrasing can change them and truly recurring identical promises can collide. Stronger semantic/recurrence deduplication belongs to the storage/integration slice; do not claim it is solved here.

The endpoint returns 400 for invalid input, 413 for size limits, 415 for wrong content type, and informative 5xx for unavailable/configuration/timeout/invalid-model conditions. The host must display errors, keep no-results distinct, and never substitute demo fixtures. Limits and exact error details are in the [module guide](./README.md).

The deadline validator deliberately favors defensible date-only values over invented times/offsets. Vague/unsupported deadlines stay null. Complex group-chat recipients can fail conservative recipient-proof checks or stay unknown; these checks and prompting are not a complete semantic proof of a promise. Disclose provider processing before importing sensitive messages. The per-process concurrency cap is not distributed public abuse protection.

## Repeat the checks

```bash
npm ci
node tests/ai-extraction/run.mjs
npm run check
npm run dev
node tests/ai-extraction/live-smoke.mjs
# Production verification, after secrets are configured in that hosting environment:
OPENLOOP_TEST_ORIGIN=https://your-production-site.example node tests/ai-extraction/live-smoke.mjs
```

Only fictional data is used by the live script. No browser/UI/storage or published end-to-end acceptance is claimed by these backend checks.

**Next step:** review this feature PR, coordinate integration with Members 1/2/4/5, and verify deployed inference. The author must not merge it to main; the user's explicit instruction is branch-only delivery.
