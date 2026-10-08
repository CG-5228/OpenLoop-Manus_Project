# OpenLoop — Member 3 AI Extraction Handoff

**From:** Member 2 — Conversation Processing
**To:** Member 3 — AI Commitment Extraction
**Snapshot:** 8 October 2026
**Repository:** [CG-5228/OpenLoop-Manus_Project](https://github.com/CG-5228/OpenLoop-Manus_Project)
**Your branch:** `feature/ai-extraction`
**Member 2 branch:** `feature/conversation`
**Member 2 review:** [Pull request #1](https://github.com/CG-5228/OpenLoop-Manus_Project/pull/1)

> **You receive structured messages. Your job is to turn them into evidence-backed commitments using real server-side AI. Do not rebuild conversation import, the dashboard or storage.**

## 1. Current integration position

Member 5's Next.js/React/TypeScript/Tailwind starter and canonical shared types are now on `main`, at foundation merge commit `787ae02d14faaa44e27970f5b37d002c7fdfa104`. Member 2 has brought that foundation into `feature/conversation` and verified compatibility.

Member 2's text-import module is implemented: pasted text, the fictional sample, `.txt` reading, multiple speakers, editable text, structured previews, sender identification and optional explicit reference date. It passes **25 module tests**, shared **lint**, **TypeScript checking** and the **Next.js production build**.

The importer is **not yet mounted in the shared application page**, and the fetched repository does **not yet contain** `src/app/api/commitments/extract/route.ts`. The module's host callback is therefore not connected to live analysis. This is a repository snapshot, not a claim about another teammate's unpushed work.

Screenshot OCR is an optional adapter boundary only; no real OCR engine is connected. You do not need OCR to deliver the P0 extraction endpoint. Pasted, sample and text-file messages use the same data contract.

## 2. Your implementation boundary

| You own | You do not own |
| --- | --- |
| `POST /api/commitments/extract` | Conversation input/parsing and OCR UI — Member 2 |
| Real server-side AI provider integration | Landing/dashboard layout — Member 1 |
| Promise identification, promisor/beneficiary and direction | Browser persistence and commitment actions — Member 4 |
| Deadline interpretation and exact evidence | Shared app setup, merge/release coordination — Member 5 |
| Request/model-output validation and endpoint tests | Optional completion-resolution endpoint — Member 5 |

Suggested locations are `src/app/api/commitments/extract/route.ts` and a dedicated `src/lib/ai/` module for extraction/provider/validation helpers. These are suggestions, not new shared contracts. Import existing domain types from `@/types/openloop`; do not redefine them or replace the root app.

## 3. Exact request contract

```http
POST /api/commitments/extract
Content-Type: application/json
```

```ts
import type { Message } from "@/types/openloop";

// Shape supplied by ConversationImporter({ onImport }).
// Use the canonical Message; this is a request illustration, not a new shared type file.
type ExtractionRequest = {
  messages: Message[];
  currentUserLabel: string;
  referenceDate?: string; // Explicit YYYY-MM-DD conversation context.
};
```

The canonical `Message` fields are:

```ts
{
  id: string;
  conversationId: string;
  sender: string;
  text: string;
  sentAt: string | null;
  source: "paste" | "txt" | "image";
}
```

**Use `"txt"`, not `"text"`.** `PROJECT_BRIEF.md`, the root README and the actual shared source file agree on the newer contract. The older `BRIEF.md` differs and should not drive this integration.

`currentUserLabel` is user-selected, not inferred by the parser. Unattributed content can have sender `Unknown sender`; do not invent a person's identity from that placeholder. Message IDs identify source evidence, not the real-world person.

## 4. Exact success response

```ts
import type { Commitment } from "@/types/openloop";

// HTTP 200 JSON:
{ commitments: Commitment[] }
```

Each commitment uses the existing shared fields:

```ts
{
  id: string;
  title: string;
  promisor: string;
  beneficiary: string | null;
  direction: "you_owe" | "they_owe" | "unknown";
  dueAt: string | null;
  evidenceQuote: string;
  sourceMessageId: string;
  confidence: "high" | "medium" | "low";
  status: "pending" | "completed" | "dismissed";
}
```

Newly extracted open promises should normally be returned as `pending`. Never return `overdue` as a stored status; Member 4 derives it from status/deadline. Empty results are a valid `{ "commitments": [] }`, not a provider failure.

## 5. Synthetic request to test immediately

This example uses fixed IDs for manual endpoint testing. The actual importer generates IDs; retain the IDs it supplies when linking evidence. All text below is fictional and matches the shared sample.

```json
{
  "messages": [
    {
      "id": "sample-message-1",
      "conversationId": "sample-conversation",
      "sender": "Me",
      "text": "I'll send Sarah the slides by 8 tonight.",
      "sentAt": null,
      "source": "paste"
    },
    {
      "id": "sample-message-2",
      "conversationId": "sample-conversation",
      "sender": "James",
      "text": "I'll email you the report tomorrow.",
      "sentAt": null,
      "source": "paste"
    },
    {
      "id": "sample-message-3",
      "conversationId": "sample-conversation",
      "sender": "Me",
      "text": "I'll transfer Sam €20 on Friday.",
      "sentAt": null,
      "source": "paste"
    },
    {
      "id": "sample-message-4",
      "conversationId": "sample-conversation",
      "sender": "Alex",
      "text": "I'll send you the API key.",
      "sentAt": null,
      "source": "paste"
    },
    {
      "id": "sample-message-5",
      "conversationId": "sample-conversation",
      "sender": "Sarah",
      "text": "I might review your CV sometime.",
      "sentAt": null,
      "source": "paste"
    }
  ],
  "currentUserLabel": "Me",
  "referenceDate": "2026-10-08"
}
```

Expected extraction targets—not hardcoded response data:

| Source ID | Promise | Direction | Beneficiary | Deadline handling |
| --- | --- | --- | --- | --- |
| `sample-message-1` | Me sends Sarah the slides | `you_owe` | Sarah | 8 October 2026; preserve evening-time meaning only if the app has sufficient timezone/time context. Do not invent a UTC offset. |
| `sample-message-2` | James emails the report | `they_owe` | Me | `2026-10-09`, anchored to the explicit reference date. |
| `sample-message-3` | Me transfers Sam €20 | `you_owe` | Sam | Friday is `2026-10-09` for this explicit reference date. |
| `sample-message-4` | Alex sends the API key | `they_owe` | Me | `null` — no deadline stated. |
| `sample-message-5` | Sarah might review the CV | No definite commitment | — | Exclude from the four definite promises. |

The target is **four definite commitments: two `you_owe`, two `they_owe`**. Use the real extraction path for this sample and for custom input.

## 6. Parsing and date details that matter

Member 2 performs format parsing only. It preserves tentative statements and questions for your model to interpret. It does not turn “tomorrow” into a deadline, filter promises, infer the current user or create AI results.

The sample's textual timestamps lack timezone offsets. By default the parser leaves `sentAt: null`, while the importer supplies the sample's explicit `referenceDate: "2026-10-08"`. If the host supplies a known `timestampOffset` such as `+01:00`, supported timestamped messages are converted to ISO UTC instead. Missing/invalid/ambiguous timestamps remain null.

Use dated message context when it is reliable, or the explicit reference date when no reliable timestamp exists. If neither anchors a relative date, leave `dueAt: null`. Never silently use today's server date or invent a timezone. Date-only deadlines are allowed by the shared contract; the application treats them as end of that local day. Keep uncertain deadline interpretation visible rather than manufacturing precision.

Message content is preserved inside each structured message, apart from format prefixes and outer trimming. Validate evidence against the **supplied `message.text`**, not against the original pasted header/timestamp line.

## 7. Required extraction and validation behaviour

| Area | Required behaviour |
| --- | --- |
| Real inference | Use a deployment-compatible server-side model. Do not return sample fixtures as though AI ran. |
| Promises versus speculation | Distinguish definite commitments from questions, hypothetical statements, suggestions, “might” and casual conversation. |
| Direction | Use the explicit current-user label. Allow `unknown` where parties/direction cannot be justified; do not assume every other-person promise is owed to the user. |
| Evidence | `sourceMessageId` must exist in this request, and `evidenceQuote` must appear exactly in that message's text. Reject or remove unsupported output rather than inventing evidence. |
| Dates | Return supported ISO dates/date-times or null. Missing deadlines and unanchored relative dates remain null. |
| Output shape | Validate required fields, enums and string/date values against the canonical Commitment contract before responding. |
| Input limits | Validate message arrays, strings, identity and optional date. The importer permits up to 100,000 text characters; define a documented endpoint limit and visibly reject excess instead of silently truncating. |
| Failure handling | Bad input gets an informative 4xx; provider/configuration failures get an informative error, not fake success. Avoid logging private conversation bodies or secrets. |
| Duplicates | Coordinate repeat-import deduplication with Member 4/5. A new import generates new message IDs, so IDs alone are not a cross-import duplicate key. |

The success response is agreed; the error JSON envelope is not yet a shared contract. A useful **proposal to coordinate** is `{ "error": { "code": "...", "message": "..." } }`, with 400 for invalid input, 413 for request-size limits and an appropriate 5xx for unavailable/failing inference. Do not silently introduce a response shape the host cannot display.

## 8. Provider and secret readiness

Verify **deployed runtime** access with Member 5 before investing in prompt tuning. A development environment's model access does not prove the published website can call that provider. Record the actual provider, model, required environment-variable names and deployment configuration once verified. Keep all credentials server-side, out of browser bundles and GitHub; this handoff contains no credentials.

If inference is unavailable, report the blocker promptly and return an honest endpoint error. A separately labelled test/demo fixture is not a substitute for live MVP analysis. Do not add authentication, messaging-platform sync or automatic follow-ups to this task.

## 9. Integration handshake

Member 1 mounts `ConversationImporter` and provides an async `onImport` callback. The host submits the payload to your endpoint, awaits the response and passes validated commitments to Member 4's storage/dashboard flow. A rejected callback is shown by the importer as an error; returning an awaited operation preserves its loading state.

Member 3 can start from current `main`; the canonical shared types are already there. You do not need to copy or rebuild Member 2's module. Review PR #1 for the importer; Member 5 coordinates merging both feature slices. Do not merge or overwrite another teammate's feature branch independently.

## 10. Your delivery checklist

- [ ] Use your existing `feature/ai-extraction` branch, or create it from fresh `origin/main` if it does not exist. Preserve uncommitted work and other team members' modules.
- [ ] Confirm usable server-side inference in the intended deployment and document actual secret names, without their values.
- [ ] Implement the exact extraction request/success response with canonical shared types.
- [ ] Validate inputs and model output, including source-linked evidence, enums and dates.
- [ ] Test the five-message sample using real inference; check the four target commitments and directions.
- [ ] Test custom promises, tentative statements, no-promise text, missing deadlines, unanchored “tomorrow”, malformed input and provider failure.
- [ ] Run `npm run check` and your endpoint tests. Record actual output; do not call synthetic provider mocks a live-inference test.
- [ ] Commit/push your feature branch, open a PR and give Member 5 the endpoint status, provider/deployment status, test evidence and remaining blockers.

## 11. Ready-to-paste instruction for your Manus task

> I am Member 3 of OpenLoop and own `feature/ai-extraction` in `CG-5228/OpenLoop-Manus_Project`. Read this handoff and the repository's current `PROJECT_BRIEF.md`, README and canonical `src/types/openloop.ts`. Work only on the extraction feature in the shared Next.js application; preserve conversation import, dashboard, storage and shared contracts. First confirm a deployment-compatible server-side AI provider with the integration owner. Implement `POST /api/commitments/extract`, accepting `{ messages: Message[], currentUserLabel: string, referenceDate?: string }` and returning `{ commitments: Commitment[] }`. Use real inference, validate requests/model output, retain exact evidence tied to valid source IDs, distinguish definite promises from speculation, classify direction using the explicit user label, and never invent deadlines or timezone context. The importer uses source `txt`, and its unzoned sample passes null timestamps plus explicit reference date `2026-10-08`. Test the sample and newly submitted input through the same real endpoint; run lint, typecheck, build and endpoint tests, then commit/push the assigned branch and prepare a PR. Report missing deployed credentials or provider failures rather than substituting hardcoded success. Do not rebuild another member's feature.
