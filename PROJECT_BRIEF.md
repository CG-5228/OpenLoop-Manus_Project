# OpenLoop — Hackathon Project Brief

> **Never forget what you owe — or what you're owed.**  
> **Event:** Dublin AI Build Challenge · 8 October 2026 · Build with Manus  
> **Team:** 5 · **Submission deadline:** **8:30 PM (Dublin time)**

## 1. The problem

People make small promises in WhatsApp, Discord, group chats, emails and everyday conversations: “I'll send the slides tonight,” “I'll transfer you €20,” “I'll get back to you Friday.” These commitments often never reach a to-do list and are forgotten. The reverse problem is just as common: someone promised you something and you cannot remember who, what or when.

## 2. The solution

**OpenLoop** turns a pasted or uploaded conversation into a clear, evidence-backed list of commitments:

- **You Owe:** promises made by the user.
- **They Owe You:** promises other people made to the user.
- **Actions:** mark complete, dismiss, adjust deadline, generate a follow-up to copy.

The AI identifies **who promised what, to whom, and when**, and links each result to the **original message**. It must distinguish actual commitments from speculation or casual remarks.

**One-line pitch:** *To-do apps remember the tasks you enter. OpenLoop remembers the promises you never entered.*

## 3. The two-minute user journey

1. Open a public, no-login OpenLoop website.
2. Paste a conversation **or click “Try sample conversation.”** (Optional: upload a `.txt` file or screenshot.)
3. Specify **which sender is you** and provide conversation date/context if timestamps are missing.
4. Click **Find commitments**. The deployed app runs **real AI analysis**, not a hardcoded list.
5. See cards under **You Owe** and **They Owe You**, with deadlines, evidence quotes and confidence.
6. Mark a promise complete, edit a deadline, or generate a contextual follow-up and copy it.

**Optional enhancement:** Import later messages and suggest whether an existing commitment was fulfilled. The user confirms before closing it.

## 4. MVP scope — build this first

| Priority | Feature | Definition of done |
|---|---|---|
| **P0** | Paste conversation / sample conversation | Input produces structured messages; sender identity is configurable. |
| **P0** | AI commitment extraction | Live model endpoint returns valid commitments, correct direction, evidence and defensible dates. |
| **P0** | Dashboard | Counts, **You Owe / They Owe You** sections, readable evidence and deadlines. |
| **P0** | Commitment actions | Complete / undo / dismiss / edit deadline; changes survive page refresh in this browser. |
| **P0** | Public deployment | Link opens without login; the sample works end-to-end. |
| **P1** | Follow-up generator | Generates editable/copyable message; **does not send** it. |
| **P1** | `.txt` import and screenshot OCR | Text reaches the same parsing pipeline; OCR result can be corrected. |
| **P2** | Smart completion suggestions | Later messages suggest closure with source evidence and confirmation. |

**Out of scope tonight:** direct WhatsApp/Discord/Gmail sync, authentication, accounts, notifications, calendar sync, production-grade multi-user infrastructure, automatic messaging. A beautiful UI without a working core is not a finished MVP.

## 5. Judging alignment

The published criteria are **Usefulness 40%**, **Clarity 30%**, **Execution 30%**. The reviewing agent reads the website explainer and examines the deployed link. First screen must immediately communicate *what OpenLoop does and who it helps*; the sample button must lead to a working flow without a login or real private messages.

**Proposed website headline:** **Your conversations are full of promises. OpenLoop makes sure they aren't forgotten.**

**Proposed website explainer (ready for submission):**

> OpenLoop helps people remember commitments buried in everyday messages. Paste a conversation or try our sample, and AI extracts who promised what, when it is due, and the original message as evidence. See what you owe and what others owe you, mark promises completed, and draft a follow-up in seconds. No account is needed to try it. The demo uses fictional conversations; OpenLoop does not connect to or send messages through WhatsApp or Gmail.

## 6. Five-person build ownership

Everyone uses Manus on **one shared Next.js repository**, each working in a feature branch. Each member owns a **working product slice**, rather than a traditional engineering job title.

| Member | Git branch | Product ownership | Minimum delivery |
|---|---|---|---|
| **1 — Dashboard & UI/UX** | `feature/frontend` | Product presentation, responsive dashboard, cards, filters, empty/loading/error states. | Site looks finished and renders real `Commitment[]` via agreed hook/props. |
| **2 — Conversation Processing** | `feature/conversation` | Paste workflow, sender selection, message parsing, `.txt` and optional screenshot OCR. | Emits valid `Message[]` to AI endpoint; sample goes through same route. |
| **3 — AI Commitment Extraction** | `feature/ai-extraction` | Prompting, extraction API, responsible-person/direction identification, deadlines, evidence, validation. | Real AI endpoint correctly handles supplied test cases. **Check usable deployed AI access immediately.** |
| **4 — Commitment Management** | `feature/commitments` | Browser persistence, complete/dismiss/edit actions, follow-up generation. | Clear shared hook/service API and working follow-up action. |
| **5 — Integration & Smart Resolution** | `feature/resolution` | **Initial project + type contracts**, merge coordination, testing, deployment, optional completion detection. | Publish and verify complete working journey. **Integration comes before optional AI resolution.** |

**Important:** The first person to modify app-wide layout/routes should be Member 1. Member 5 coordinates merges with Member 1 rather than overwriting that work. No one asks Manus to independently create a separate full OpenLoop app.

## 7. Stack and architecture

- **Framework:** Next.js App Router + React + TypeScript + Tailwind CSS.
- **Code:** one GitHub repository, one web application, Next.js server routes for model calls.
- **Persistence (MVP):** browser `localStorage` behind a reusable commitment hook/service. No account required.
- **AI:** real model inference executed server-side via a **verified deployment-compatible provider/integration**. Manus development credits **do not automatically imply** an API key for visitors using the deployed app. Member 3 and Member 5 must confirm model credentials/access early.
- **Files:** text paste first; `.txt` optional; OCR secondary. Never expose model credentials in client code or GitHub.

**Planned flow:**

```text
Paste text / Try sample / Upload
                |
                v
         Message[] parser
                |
                v
   POST /api/commitments/extract  <-- server-side AI
                |
                v
         Commitment[]
                |
                v
       browser persistence
                |
                v
   Dashboard: You Owe / They Owe You
                |
                +--> complete / dismiss / change deadline
                +--> POST /api/follow-up --> draft + copy
                +--> optional completion suggestion
```

## 8. Shared contracts — do not change independently

Member 5 creates `src/types/openloop.ts` on `main` **before others branch**:

```ts
export type Source = "paste" | "txt" | "image";
export type Confidence = "high" | "medium" | "low";
export type Direction = "you_owe" | "they_owe" | "unknown";
export type CommitmentStatus = "pending" | "completed" | "dismissed";

export interface Message {
  id: string;
  conversationId: string;
  sender: string;
  text: string;
  sentAt: string | null; // ISO date-time when known
  source: Source;
}

export interface Commitment {
  id: string;
  title: string; // concise action description
  promisor: string;
  beneficiary: string | null;
  direction: Direction;
  dueAt: string | null; // ISO date/date-time, null if unknown
  evidenceQuote: string; // exact text from source message
  sourceMessageId: string;
  confidence: Confidence;
  status: CommitmentStatus;
}

export interface CompletionSuggestion {
  commitmentId: string;
  sourceMessageId: string;
  evidenceQuote: string;
  confidence: Confidence;
  reason: string;
}
```

**Rules:** `overdue` is computed from `dueAt` and `status` (not stored as a status). For a date-only deadline, treat it as end of that local day. If “tomorrow” cannot be anchored to a dated message or explicit reference date, leave `dueAt: null`; never invent a date. Any `evidenceQuote` must be present in the cited message. Unknown/unrelated parties must not be silently classified as the current user.

**API contracts:**

```text
POST /api/commitments/extract
Body: { messages: Message[], currentUserLabel: string, referenceDate?: string }
200:  { commitments: Commitment[] }

POST /api/follow-up
Body: { commitment: Commitment, tone?: "casual" | "polite" }
200:  { message: string }

P2 ONLY: POST /api/commitments/resolve
Body: { messages: Message[], commitments: Commitment[] }
200:  { suggestions: CompletionSuggestion[] }
```

Return informative `4xx/5xx` errors (no made-up success or silent fixture fallback when AI fails). Validate request sizes and model responses. The front end must visibly handle loading, empty results, bad uploads and model failures.

**Internal component interfaces (coordinate before coding):** `ConversationImporter({ onImport })` returns `{ messages, currentUserLabel, referenceDate? }`; `useCommitments()` exposes `commitments`, `addCommitments`, `updateCommitment` and `dismissCommitment`. Keep names consistent across branches.

## 9. Parallel GitHub workflow

1. Member 5 creates the Next.js app, checks that `npm run build` passes, adds this brief and `README.md`, writes the shared type file, and pushes **`main`**.
2. Everyone clones the same repository, pulls `main`, and creates **only their assigned branch**.
3. Members agree on the API contract above before generating code. Each Manus task says **“work only on this branch/feature; preserve existing shared types and other modules.”**
4. Build feature slices independently. If another feature isn't available yet, use a typed **local mock for development**, clearly marked and removed from the final main-path demo.
5. Push small working commits and open PRs. Merge each working slice **as soon as it passes a smoke test**, not all at once at 8:20.
6. Member 5 integrates early, runs build/tests, checks deployed link and site explainer; Member 1 owns last-mile visual polish.

**Time guardrails:** Within the first ~15 minutes, agree on stack, shared types and provider access. Reserve the final ~30 minutes for integration, real testing, deployment and submission. The **8:30 PM** deadline is a hard cutoff.

## 10. Demo and acceptance tests

**Synthetic example conversation** (identifying user as `Me`, date `2026-10-08`):

```text
2026-10-08 17:00 | Me: I'll send Sarah the slides by 8 tonight.
2026-10-08 17:01 | James: I'll email you the report tomorrow.
2026-10-08 17:02 | Me: I'll transfer Sam €20 on Friday.
2026-10-08 17:03 | Alex: I'll send you the API key.
2026-10-08 17:04 | Sarah: I might review your CV sometime.
```

**Expected:** Four definite commitments (two `you_owe`, two `they_owe`); Sarah's tentative statement should **not** be treated as a definite promise. James's “tomorrow” resolves relative to 8 Oct; Alex's unspecified deadline stays null. Show the exact supporting quote. Analyse this sample through the **same real AI endpoint** as normal user text.

**Required smoke tests:** sample analysis; custom input; correct directions; unknown deadline; obvious non-promise; complete/undo/dismiss/edit; refresh persistence; follow-up generator if implemented; loading/error states; no console errors; phone viewport; public deployment opens in a logged-out browser. Repeat imports should not create obvious duplicates.

## 11. Safety, honesty, and submission

- Use synthetic messages for demonstration; never require real private conversations.
- Don't claim live WhatsApp, Gmail or Discord connections; no platform APIs are part of this MVP.
- Don't auto-send reminders/follow-ups. Users review and copy generated text themselves.
- Show evidence and uncertainty; AI can misinterpret promises.
- Don't commit `.env.local` or API keys; configure secrets in hosting environment.
- Don't describe unimplemented features as working in the submitted website explainer.

**Final handoff:** a public website URL, a short explainer consistent with that running website, the GitHub repository, and a repeatable sample conversation that demonstrates genuine AI extraction. Submission must be made **before 8:30 PM Dublin time**.

---

## 12. Paste into Manus (one sentence per member)

All members: give Manus this file's full contents, then append the matching instruction:

- **Member 1:** “I own `feature/frontend`. Implement the landing/dashboard UI, commitment cards, filters and states using the shared types and `useCommitments` contract. Don't rebuild parsing or AI services.”
- **Member 2:** “I own `feature/conversation`. Implement paste input, sender identification, `Message[]` parsing, sample input, and optionally `.txt`/image import. Don't rebuild extraction or dashboard.”
- **Member 3:** “I own `feature/ai-extraction`. First confirm a deployment-compatible model provider; implement and validate `POST /api/commitments/extract` using real inference and the exact shared schema.”
- **Member 4:** “I own `feature/commitments`. Implement browser persistence and action hooks, then `POST /api/follow-up` if time allows. Integrate through shared types; don't replace the dashboard.”
- **Member 5:** “I own `feature/resolution` and integration. First create the shared repository skeleton, types and build check on `main`; then manage merges, run end-to-end tests, deploy, and add completion suggestions only if time remains.”

**All members:** “Work in the shared repo, use only my assigned branch, do not rewrite other feature modules, and prioritise a running MVP over optional features.”
