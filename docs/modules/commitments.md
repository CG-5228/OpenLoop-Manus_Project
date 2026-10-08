# Module D — Commitment Management (Member 4)

**Owner:** Member 4 · **Branch:** `feature/commitments` · **Built on:** `main` foundation (`src/types/openloop.ts`)

This module covers what a user can do with an extracted commitment: **browser persistence, complete / undo / dismiss / edit, overdue calculation, completion-suggestion bookkeeping and AI follow-ups** (`POST /api/follow-up`). It gives the dashboard hooks and plain functions, and does **not** render the product UI. It adds no shared types, dependencies or config changes.

## 1. Files

| Path | Purpose |
|---|---|
| `src/hooks/useCommitments.ts` | **Public hook entry** (README layout): `useCommitments`, `useCommitment`, `useFollowUp`, `useNow` |
| `src/app/api/follow-up/route.ts` | `POST /api/follow-up` (README contract) and `GET` health check |
| `src/lib/commitments/index.ts` | Public API with no React (safe on server and client) |
| `src/lib/commitments/hooks.ts` | Hook implementations and the non-throwing `commitmentContract` |
| `src/lib/commitments/store.ts` | localStorage-backed external store (`commitmentStore`) |
| `src/lib/commitments/dates.ts` / `status.ts` | Deadlines, **overdue**, labels; derived status, stats, filters, urgency sort |
| `src/lib/commitments/dedupe.ts` / `validate.ts` | Duplicate-import detection; runtime validation of the shared types |
| `src/lib/commitments/followup.ts` / `.server.ts` / `-client.ts` | Prompt and validation; server-only AI call; browser fetch and clipboard |
| `src/lib/commitments/__tests__/` | 84 unit tests on Node's built-in runner (`node:test`) |
| `src/lib/commitments/__fixtures__/demo.ts` | **Synthetic** data for the harness and tests only |
| `src/app/dev/commitments/` | Dev harness; returns 404 unless `NEXT_PUBLIC_OPENLOOP_DEV_TOOLS=1` at build time |

## 2. The team contract: `useCommitments()`

```tsx
"use client";
import { useCommitments } from "@/hooks/useCommitments";

const { commitments, addCommitments, updateCommitment, dismissCommitment, state, error } =
  useCommitments();

addCommitments(extracted, importedMessages); // duplicates skipped; only cited messages kept
updateCommitment(id, { status: "completed" }); // complete
updateCommitment(id, { status: "pending" });   // undo complete / undo dismiss
updateCommitment(id, { dueAt: "2026-10-09" }); // edit deadline (null clears it)
dismissCommitment(id);                         // "not a commitment"
```

| Field | Returns | Notes |
|---|---|---|
| `commitments` | `Commitment[]` | All statuses, sorted by urgency. Optional filters: `useCommitments({ direction, status, query })` |
| `addCommitments(list, messages?)` | `{ added, updated, duplicates, rejected } \| null` | Validates, de-duplicates, re-keys colliding ids |
| `updateCommitment(id, patch)` | `Commitment \| null` | Patch any of `status`, `dueAt`, `title`, `beneficiary`, `direction`, applied **atomically** |
| `dismissCommitment(id)` | `Commitment \| null` | Same as `updateCommitment(id, { status: "dismissed" })` |
| `state` | `"loading" \| "ready"` | `"loading"` during SSR and hydration, until browser storage is read |
| `error` | `string \| null` | Non-fatal message from the last failed action; the next success clears it |
| `isPersistent` | `boolean` | `false` if the browser blocks storage (data then lasts only for this tab) |
| `suggestions`, `saveSuggestions`, `confirmSuggestion(id)`, `rejectSuggestion(id)` | — | Member 5's completion suggestions; never auto-applied |
| `getCommitment(id)`, `getMessage(id)` | `… \| undefined` | `getMessage` returns the stored source message (sender, `sentAt`) for evidence |
| `stats`, `sections`, `getStatus(c)`, `reload()`, `clearAll()`, `actions` | — | Headline numbers, You Owe / They Owe You groups, derived status, raw store methods |

**The contract functions never throw.** On failure (storage full or blocked, unknown id, invalid deadline) they return `null` and set `error`, so the dashboard stays usable. `actions.*` exposes the raw store methods, which *do* throw.

Other hooks: `useCommitment(id)` returns `commitment`, `record`, `suggestions`, `displayStatus`, `isOverdue`, `deadlineLabel`, `notFound` and bound `actions`. `useFollowUp(commitment, { tone, currentUserLabel, allowTemplate })` handles generate, edit, copy and reset. `useNow()` is a shared 30-second clock. All hooks are prerender-safe with Next 16 Cache Components.

Filter values: `direction` is `all | you_owe | they_owe | unknown`. `status` is `all | open | pending | overdue | needs_review | completed | dismissed`, where `open` means every pending item. `query` matches title, people and evidence (multi-word, case- and punctuation-insensitive).

### Live dashboard wiring (`dashboard-data-provider.tsx`)

This PR adds `useLiveAdapter()` to Member 1's provider and makes it the default (`mode: "live"`). No dashboard components changed.

| `DashboardDataApi` | Backed by |
|---|---|
| `commitments`, `suggestions`, `state`, `error`, `getCommitment`, `getMessage`, `reload` | `useCommitments()` |
| `addCommitments(list, messages)` | Store `saveCommitments`; shows an "N already tracked" toast when a re-import skips duplicates |
| `markCompleted` / `restore` / `dismiss` / `updateDeadline` | `updateCommitment(id, { status \| dueAt })` |
| `confirmSuggestion` / `rejectSuggestion` / `clearAll` | Store `acceptSuggestion` / `rejectSuggestion` / `clearAll` |
| `generateFollowUp(c)` | Member 1's `requestFollowUp()` → `POST /api/follow-up` |

**Failure honesty:** Member 1's action wrappers show their success toast right after the call. So on a failed write the adapter shows a `Couldn't …` error toast and re-throws, which skips the false "Loop closed" toast. `resetDemo` is not provided in live mode, so the empty state hides "Load demo data".

**QA:** any `?demo-state=` parameter (`loading`, `empty`, `error` or `demo`) still selects Member 1's labelled demo adapter. Stored data is never touched in that mode.

## 3. Feeding data in (Members 2, 3 and 5)

```ts
addCommitments(extractResponse.commitments, payload.messages); // after POST /api/commitments/extract
saveSuggestions(resolveResponse.suggestions, newMessages);     // after POST /api/commitments/resolve (optional)
```

Invalid items are returned in `rejected` or `ignored` and never stored. Only messages **cited** by a stored commitment, suggestion or completion evidence are kept, never whole conversations, and they are pruned when no longer cited. Suggestions are ignored when they target unknown or non-pending commitments, duplicate an existing suggestion, or were rejected before.

## 4. Status model

Stored statuses are exactly the shared `CommitmentStatus` values. Display statuses are **derived**, never stored:

| Stored | Display | Rule |
|---|---|---|
| `pending` | **Needs Review** | Open completion suggestion, `confidence: "low"`, or `direction: "unknown"` |
| `pending` | **Overdue** | `dueAt` has passed; a bare date (`2026-10-09`) means the end of that local day |
| `pending` | **Pending** | Otherwise |
| `completed` / `dismissed` | Same | `completedAt` / `dismissedAt` set or cleared on every transition; open suggestions are dropped |

`stats.overdue` counts every pending item past its deadline, even one that also needs review.

## 5. Duplicate imports (BRIEF Test 7)

Two commitments are the same when **either** they have the same promisor and evidence quote (ignoring case, punctuation and quote style), **or** the same promisor, beneficiary, title and deadline date. The stored item keeps every user change (completed, dismissed, edited deadline). The only enrichment: a missing deadline is filled in from a re-import, unless the user set or cleared it themselves.

## 6. Storage

localStorage key `openloop:commitments:v1`, holding `{ version: 1, records, suggestions, rejectedSuggestionKeys, messages }`. Data saved before `messages` existed still loads. Corrupt data is backed up to `openloop:commitments:v1:corrupt` rather than discarded. Changes sync across tabs. Mutations are browser-only, so nothing can leak between server requests. A failed write (for example, quota exceeded) leaves the state unchanged.

## 7. `POST /api/follow-up`

The team contract from README → "API contracts":

```http
POST /api/follow-up
{ "commitment": Commitment, "tone": "casual" }      → 200 { "message": "..." }
```

| Aspect | Behaviour |
|---|---|
| Tones | `casual` (default), `polite`, `firm`; `friendly` and `neutral` are accepted as aliases |
| Optional body fields | `currentUserLabel`, `now` (client ISO time), `allowTemplate` |
| Extra response fields | `source: "ai" \| "template"`, `model`, `notice`; clients that only read `message` can ignore them |
| Errors (`{ error }`) | 400 invalid body · 413 body over 16 KB · **503 AI not configured** · **502 provider failure or unusable output** |
| No silent fallback | A non-AI template is returned **only** when the client sends `allowTemplate: true`, labelled `source: "template"` with a `notice`. The dev harness opts in; the dashboard does not. |
| Grounding | The model gets only the commitment's own facts. It must not invent reasons, dates, needs or claims; output with placeholders is rejected. `they_owe` gives a nudge, `you_owe` an update that never claims the item is done, `unknown` a neutral check-in. |
| Sending | Never. The user reviews, edits and copies the draft. |

Server-only environment variables (never `NEXT_PUBLIC_`): `OPENAI_API_KEY` (required for AI), `OPENAI_BASE_URL` or `OPENAI_API_BASE` (default `https://api.openai.com/v1`), and `OPENAI_FOLLOWUP_MODEL` → `OPENAI_MODEL` → `gpt-5-mini`. `GET /api/follow-up` returns `{ aiConfigured, model }` with no secrets. Measured latency is about 1.2–1.6 s per draft.

## 8. Testing

```bash
npx -y tsx --test src/lib/commitments/__tests__/*.test.ts   # 84 unit tests, no new dependencies
npm run check                                               # lint + typecheck + build

# Dev harness (synthetic data):
NEXT_PUBLIC_OPENLOOP_DEV_TOOLS=1 npm run build && npm run start   # → /dev/commitments
```

End-to-end check (sandbox, live AI): Member 2's parser on the sample conversation → Member 3's `/api/commitments/extract` (4 commitments; "I might…" correctly skipped) → this store (4 added, 0 rejected). A **real re-import** with new message ids and a fresh AI call gave 0 added and 4 duplicates. In the real `/dashboard`: complete via the card checkbox ("Loop closed" with Undo, counts 4 → 3) → AI follow-up in Member 1's dialog → refresh, and the state persisted.

The tests use `node:test` with a tiny local `expect` adapter (`__tests__/expect.ts`), so `npm run typecheck` covers them without adding `vitest`. They cover deadlines and overdue logic, persistence and corruption recovery, duplicates, `updateCommitment` status patches, cited-message storage, suggestions, stats and filters, follow-up validation and generation (with a mocked provider), and the route's status codes.

## 9. Known limitations (MVP)

| Limitation | Impact |
|---|---|
| localStorage only | Per browser and per device; a database later only needs a new `StorageLike` adapter |
| Duplicate rule 2 | Could merge two genuinely separate promises with identical title, people and deadline |
| Follow-up deadline wording | If an edited deadline contradicts the quote, the casual tone occasionally says "you said … by <edited date>" |
