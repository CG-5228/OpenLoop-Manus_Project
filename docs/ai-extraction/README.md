# Member 3 — AI commitment extraction

This slice implements `POST /api/commitments/extract` in the existing Next.js app. It does not mount Member 2's importer, change Member 1's dashboard, or save commitments. The canonical shared contract is imported from `src/types/openloop.ts`; no types were redefined.

## Runtime configuration

| Variable | Requirement |
| --- | --- |
| `OPENAI_API_KEY` | Required **server-only** credential. Never use a `NEXT_PUBLIC_` name or commit its value. |
| `OPENAI_MODEL` | Optional; defaults to `gpt-5-mini`. The development catalog and real acceptance checks verify this model, not every compatible provider/model. |
| `OPENAI_BASE_URL` | Optional OpenAI-compatible API base including `/v1`, default `https://api.openai.com/v1`. HTTPS only, no URL credentials/query. |
| `OPENAI_API_BASE` | Compatibility alias if `OPENAI_BASE_URL` is absent, useful for the configured sandbox. |

The provider is called only by the server route, at `<base>/chat/completions`. It must support OpenAI strict JSON-schema chat completions (`anyOf` nullable fields) and `max_completion_tokens`. No SDK or extra runtime dependency is required. Set values in local ignored `.env.local` or the actual hosting secret environment. Configuration is read at request time; keys are not required for `next build` and are not embedded in the browser.

**Production gate:** sandbox inference access does not prove published access. Member 5 must configure the hosting secrets, verify the actual provider/model, and run the smoke script against the deployed URL before marking the public MVP complete. Do not copy or assume automatic transfer of sandbox credentials. This branch does not deploy anything.

## HTTP contract and host callback

Request content type is `application/json`:

```ts
{ messages: Message[], currentUserLabel: string, referenceDate?: string }
```

`referenceDate`, when present, is a valid `YYYY-MM-DD` date. Message `source` is `paste`, `txt`, or `image`, and `sentAt` is null or an ISO date-time with explicit zone. Current user identity must be entered/selected, not the `Unknown sender` placeholder. It can be an explicitly named non-speaker recipient. IDs must be unique within the request. Evidence is checked against `message.text`, not pasted timestamp/speaker prefixes.

HTTP 200 is **exactly** `{ commitments: Commitment[] }`; `[]` is a valid no-promises result. A new commitment is pending. Promisor is the source sender, direction is derived by the server from the explicit user identity and model-identified beneficiary, and an unknown promisor stays unknown with low confidence. Third-party debts remain `unknown`, not automatically `they_owe`.

Member 1 can provide the importer with an awaited callback:

```ts
async function onImport(payload: {
  messages: Message[];
  currentUserLabel: string;
  referenceDate?: string;
}) {
  const response = await fetch("/api/commitments/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message ?? "Conversation analysis failed.");
  }
  // Pass through the host's validated Commitment[]/storage boundary:
  addCommitments(data.commitments);
}
```

The host owns its response type guard and import-to-storage flow. A rejected awaited callback keeps Member 2's existing loading/error behavior. This snippet is integration guidance, not a replacement UI or persistence implementation.

## Limits and errors

| Condition | Response |
| --- | --- |
| Malformed JSON/UTF-8, invalid fields/identity/date/source, duplicate message IDs | 400 |
| Over 1 MiB raw JSON, 500 messages, or 100,000 aggregate message characters | 413, no silent truncation |
| Content type not `application/json` | 415 |
| Missing/invalid provider configuration or provider authentication denial | 503 |
| Provider rate limit or four active analyses already in this process | 503 |
| Provider/network failure, unreadable/refused/truncated output, invalid evidence/fields, over 100 output commitments | 502 |
| Provider request takes over 60 seconds | 504 |
| Unexpected application failure | 500 with generic safe message |

All errors use the **proposed integration envelope** `{ "error": { "code": "...", "message": "..." } }`. The success shape is unchanged. The host should display `error.message` and handle no results distinctly. Responses use `private, no-store`; private conversation bodies, keys and raw provider failures are not logged. The provider response is independently bounded at 1 MiB, including streamed responses. No retry silently replaces inference with fixtures, and no automatic messaging or completion action exists.

The four-analysis ceiling is **per Node process**, not distributed rate limiting or user authentication. An externally hosted public service should use its host's abuse/rate controls before broad production use. Conversation text is transmitted to the configured provider when analysis runs; the importer/host must disclose that to users.

## Dates, evidence and duplicates

Dates prefer the source `sentAt` calendar date over `referenceDate`. No code path uses today's server date for relative deadlines. Tomorrow, day after tomorrow, today/tonight, yesterday, `in N days`, and unqualified weekday names are resolved deterministically. Literal ISO calendar dates and supported named month/day dates can be used; a named date without a year needs a dated anchor. Impossible dates are rejected. Ambiguous expressions such as `next Friday`, `next week` and unrecognised/numeric formats remain null rather than acquiring false precision.

Without explicitly quoted ISO time-and-zone evidence, the validator returns date-only precision. The sample's `by 8 tonight` therefore retains the date, not a made-up UTC time. Date-only handling remains Member 4's end-of-local-day responsibility. More elaborate natural-language deadlines/local-zone reconstruction are deliberate conservative limitations, not implemented features.

Exact `evidenceQuote` and `deadlineQuote` must appear in the cited source. Unknown source IDs or fabricated evidence reject the analysis, not produce a fake success. Candidate JSON is fully checked; the server creates the shared fields it owns instead of asking the model for authoritative IDs, status, promisor or direction.

Recipient names require token-bound support in the source evidence, or an immediately preceding explicit direct request accepted in the source. Current-user attribution also accepts a direct recipient phrase such as "send you", not a bare incidental "you". Unsupported names/current-user spoofing reject model output rather than silently inventing a recipient. More complex group-chat addressees may conservatively require a retry or yield a null beneficiary; these checks are not a complete semantic proof of recipient intent.

Returned IDs are SHA-256-derived content keys based on normalized promisor, beneficiary, exact evidence and action title. They do not depend on import-generated source/conversation IDs, saved status, or edited due dates. Identical candidates are deduplicated in one request. Member 4 can upsert/dedupe returned IDs and preserve existing user-edited status/deadlines. The exported `commitmentContentKey` helper is **server-side** (Node crypto); browser storage can use the already returned ID. Model rephrasing of titles/evidence can change a key, so cross-import semantic matching is still a Member 4/5 integration task. Repeated identical evidence for genuinely recurring obligations can also collide; do not claim perfect recurrence-aware deduplication. No private global state/store was added.

## Reproducible checks

```bash
npm ci
node tests/ai-extraction/run.mjs  # deterministic route/provider mocks; not live inference
npm run check                   # lint, tsc --noEmit, production Next build
npm run dev
node tests/ai-extraction/live-smoke.mjs  # actual server route and real provider
# To check a deployed server with its own configured secrets:
OPENLOOP_TEST_ORIGIN=https://your-deployed-site.example node tests/ai-extraction/live-smoke.mjs
```

The live script uses only fictional input and asserts the shared sample, novel custom promises, no-promises, unanchored dates, third-party beneficiaries, timestamp priority, multiple actions, fulfilled promises, prompt injection and repeats. It prints explicit pass/fail evidence and must not be confused with deterministic mocked-provider tests. See the final Member 3 handoff for measured results and remaining integration actions.
