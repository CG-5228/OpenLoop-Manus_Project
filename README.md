# OpenLoop

**Never forget what you owe — or what you're owed.**

OpenLoop is an AI-powered web app that finds the commitments people make in everyday conversations and turns them into a simple, actionable list. Paste a chat, identify which sender is you, and OpenLoop detects **who promised what, to whom, and when**—with the original message shown as evidence.

> **To-do apps remember the tasks you enter. OpenLoop remembers the promises you never entered.**

Built by a five-person team with **Manus** for the **Dublin AI Build Challenge, 8 October 2026**.

**Project status:** Hackathon MVP in progress. This README describes our planned implementation; only mark features as complete when verified in the deployed app.

## Why OpenLoop?

In group chats, emails and messages, we say things like:

> “I'll send you the slides tonight.”  
> “I'll pay you back Friday.”  
> “I'll send over the API key tomorrow.”

Those commitments are easily lost because nobody manually adds them to a task manager. OpenLoop surfaces them automatically and keeps the supporting message visible.

## What it does

**Core MVP**

- **Import:** paste conversation text or load a fictional sample. (`.txt` and screenshot import are enhancements.)
- **Understand:** AI finds actual commitments, identifies the promisor/recipient and extracts deadlines only when supported by context.
- **Organise:** split results into **You Owe** and **They Owe You**.
- **Verify:** show the original evidence quote and confidence level for every extracted commitment.
- **Act:** complete, undo, dismiss, edit deadlines, and keep changes across refreshes in the same browser.
- **Follow up (P1):** create a contextual message for the user to review and copy—never auto-send.

**Stretch goal:** analyse subsequent messages and **suggest** when a commitment has been fulfilled; a person confirms before marking it complete.

### Intended demo flow

```text
Paste a conversation (or Try sample conversation)
                    ↓
          Identify your sender name
                    ↓
            Find commitments
                    ↓
        Server-side AI extracts promises
                    ↓
            You Owe | They Owe You
                    ↓
     Complete / Edit / Dismiss / Follow up
```

No sign-in is required for the hackathon demo. Visitors must be able to try the sample and inspect real results quickly.

## Live demo and submission

- **Demo:** _Add deployed URL here after publishing_
- **Submission:** _Add event submission link here if desired_
- **Project brief:** [PROJECT_BRIEF.md](./PROJECT_BRIEF.md)

### What to try

1. Open the deployed link and click **Try sample conversation**.
2. Click **Find commitments**; results must come from the same AI endpoint used for custom input.
3. Inspect **You Owe / They Owe You**, deadlines and source quotes.
4. Mark a commitment complete and refresh; it should remain completed.
5. If enabled, generate and copy a follow-up message.

> The example data is fictional. OpenLoop does **not** access live WhatsApp, Discord or Gmail conversations, and it does **not** send messages on your behalf.

## Tech stack

| Layer | Implementation |
|---|---|
| App | Next.js App Router, React, TypeScript |
| Styling | Tailwind CSS |
| API | Next.js server route handlers |
| AI | Deployment-compatible model provider/integration, called **server-side** |
| MVP storage | Browser `localStorage` (no accounts) |
| Collaboration | GitHub feature branches, Manus for development |
| Deployment | A public deployment compatible with Next.js and server-side AI routes |

**Important:** Manus's coding credits and temporary Pro access are **not inherently an inference key for the deployed website**. We must separately verify a supported model endpoint and configure its credentials in the deployed environment. If the AI endpoint is unavailable, do not present a hardcoded result as live AI.

## Getting started (contributors)

### Prerequisites

- Node.js version compatible with the project's installed Next.js version (use a current supported LTS release).
- npm.
- Access to the GitHub repository.
- A **server-side** AI provider credential or approved deployment integration for extraction.

```bash
git clone <YOUR_REPOSITORY_URL>
cd openloop
npm install
npm run dev
```

Open <http://localhost:3000>.

No environment variables are required. Without an AI key, OpenLoop runs **demo extraction**: rule-based, clearly labelled in the UI, and validated exactly like AI output. Commitments are saved in the browser. To enable AI extraction, set server-only secrets in `.env.local` locally and in Vercel for deployments. Do **not** commit keys or `.env.local`.

```bash
# Optional: AI extraction (OpenAI-compatible)
# OPENAI_API_KEY=your_secret_here
# OPENAI_MODEL=gpt-5-mini
# Optional: force a mode regardless of the key
# OPENLOOP_EXTRACTION_MODE=demo   # or: ai
```

To verify integration:

```bash
npm run build
```

Follow any existing project lint/test scripts if present. Run the built app and verify real analysis before deploying.

## Shared data contract

The shared interfaces live in **`src/types/openloop.ts`** and are owned initially by the integration coordinator. All feature branches import these types; do not create parallel, incompatible definitions.

```ts
export type Confidence = "high" | "medium" | "low";
export type Direction = "you_owe" | "they_owe" | "unknown";
export type CommitmentStatus = "pending" | "completed" | "dismissed";

export interface Message {
  id: string;
  conversationId: string;
  sender: string;
  text: string;
  sentAt: string | null;
  source: "paste" | "txt" | "image";
}

export interface Commitment {
  id: string;
  title: string;
  promisor: string;
  beneficiary: string | null;
  direction: Direction;
  dueAt: string | null;
  evidenceQuote: string;
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

`dueAt` is an ISO date/date-time when known; `null` otherwise. **Overdue** is derived from due date + status, not a separate saved status. A relative deadline such as “tomorrow” requires a dated message or an explicit reference date. Every `evidenceQuote` must be present in the source message. Low-confidence cases must be visibly distinguishable.

### API contracts

```http
POST /api/commitments/extract
Content-Type: application/json

{
  "messages": [/* Message[] */],
  "currentUserLabel": "Me",
  "referenceDate": "2026-10-08"
}
```

Success: `{ "commitments": Commitment[] }`.

```http
POST /api/follow-up
Content-Type: application/json

{ "commitment": /* Commitment */, "tone": "casual" }
```

Success: `{ "message": "..." }`.

**Optional stretch endpoint:** `POST /api/commitments/resolve`, body `{ messages: Message[], commitments: Commitment[] }`, response `{ suggestions: CompletionSuggestion[] }`.

API routes must validate their inputs and model responses and return clear errors on failure. They must not leak credentials, fabricated source evidence, or present static fixtures as live analysis.

## Team and ownership

All five teammates **vibe-code with Manus**, but each owns a distinct feature. We work in **one shared repository**, not five separately generated apps.

| Member | Feature | Branch | Owns |
|---|---|---|---|
| **1** | Dashboard & UI/UX | `feature/frontend` | Landing/dashboard, cards, filters, responsive design, loading/empty/error states. |
| **2** | Conversation Processing | `feature/conversation` | Text import, current-user selection, parsing, sample input, optional `.txt`/OCR. |
| **3** | AI Commitment Extraction | `feature/ai-extraction` | Model endpoint, prompt, deadlines, role identification, evidence, validation. |
| **4** | Commitment Management | `feature/commitments` | Browser persistence, complete/undo/dismiss/edit, optional follow-up endpoint. |
| **5** | Integration & Smart Resolution | `feature/resolution` | Initial repo/interfaces, continuous integration, QA, deployment, optional closure suggestions. |

**Integration has priority over Smart Resolution.** Member 5 should not spend the final 30 minutes creating an optional feature while the core app is unmerged.

### Collaboration rules

1. **Member 5** creates the starter app and shared types on `main` first. Verify a clean build.
2. Everyone branches from that same commit, imports the shared types and follows the API contracts above.
3. Manus is instructed to **modify only the assigned feature**, preserving unrelated modules. Never ask all five agents to scaffold the entire application independently.
4. Each teammate commits and pushes their own branch; open a pull request to `main`.
5. Merge and test small completed features **throughout** the build instead of attempting a five-way merge just before the deadline.
6. Member 1 controls dashboard layout; Member 5 coordinates integration without overwriting design changes.
7. Keep a clearly labelled mocked UI state only for isolated development; the submitted end-to-end demo must call real AI.

### Suggested code ownership boundaries

```text
src/
  app/
    page.tsx                        # Member 1: product experience
    api/
      commitments/
        extract/route.ts            # Member 3: real AI extraction
        resolve/route.ts            # Member 5: optional completion checks
      follow-up/route.ts            # Member 4: optional follow-up AI
  components/
    dashboard/                      # Member 1
    import/                         # Member 2
  hooks/
    useCommitments.ts               # Member 4
  lib/
    conversation/                   # Member 2
  types/
    openloop.ts                     # Member 5 initially; shared contract
```

This layout is a **proposed contract** until the starter repository is generated; update these paths if the team chooses alternatives, but coordinate the change before agents branch.

## Example conversation for demos and testing

Select **Me** as the current user, using **8 October 2026** as the reference date:

```text
2026-10-08 17:00 | Me: I'll send Sarah the slides by 8 tonight.
2026-10-08 17:01 | James: I'll email you the report tomorrow.
2026-10-08 17:02 | Me: I'll transfer Sam €20 on Friday.
2026-10-08 17:03 | Alex: I'll send you the API key.
2026-10-08 17:04 | Sarah: I might review your CV sometime.
```

Expected:

- **You Owe (2):** slides for Sarah; €20 for Sam.
- **They Owe You (2):** James's report; Alex's API key.
- James's deadline is the following day; Alex's is unspecified.
- Sarah's tentative statement **is not a confirmed promise**.
- Cards show exact source text, not invented quotes.

Use the same extraction path for this sample as for any other pasted conversation. Results may vary with the AI model; test and tune the extraction prompt rather than hardcoding outputs.

## MVP acceptance checklist

- [ ] Public site opens without signing in.
- [ ] First screen clearly explains the everyday problem and shows **Try sample conversation**.
- [ ] Pasted conversation is parsed and sent to a **real model**.
- [ ] You Owe / They Owe You are correct for the sample.
- [ ] Every commitment shows a genuine source quote; unknown dates aren't invented.
- [ ] Complete / undo / dismiss / edit deadline work and persist in the same browser.
- [ ] Duplicate imports don't produce obvious duplicate cards.
- [ ] Loading, no-results and model-error states are handled.
- [ ] Layout works on phone and desktop; no obvious console errors.
- [ ] Live deployment is tested in a logged-out window.
- [ ] Website explainer describes **only implemented features**.
- [ ] Team submission is sent before **8:30 PM Dublin time**.

## Judging and hackathon constraints

The event judges on **Usefulness (40%)**, **Clarity (30%)**, and **Execution (30%)**. A small complete experience beats a feature-rich but broken app. The judging agent reads the website explainer and inspects the running site, so make the problem, test button and user payoff obvious immediately.

**Deadline:** Thursday, **8 October 2026 at 8:30 PM (Dublin time)**. The event advertises **10,000 Manus credits to keep** and temporary Manus Pro; claim event credits through its official page. The remaining bottleneck is integration and deployed inference, not how many agent-generated files we can produce.

## Privacy and limitations

- Demo inputs are entirely fictional. No third-party private messages are required.
- The MVP uses manual text/file import and does **not** integrate with live messaging accounts.
- AI can misinterpret language; users can dismiss items and verify supporting quotes.
- Follow-ups are suggested for **human review** and are **not auto-sent**.
- With `localStorage`, commitments remain **only in that browser**; clearing browser data may remove them. There is no multi-device sync or account backup.
- Input is sent to the configured AI provider when analysis runs. Disclose that before users upload sensitive material; do not log or publicly expose message contents unnecessarily.
- Never commit secrets or claim Manus event credits cover production AI inference without verifying it.

## Team submission website explainer

> **OpenLoop finds the promises you forgot to write down.** Paste a conversation or use our fictional sample. AI identifies who promised what, when it is due, and the exact message where they said it. Commitments appear under “You Owe” and “They Owe You,” where you can mark them complete or prepare a follow-up. It's a simple way to stop small obligations disappearing into chat history—no account required to try it.

---

**Built with Manus · Dublin AI Build Challenge · DCU, 2026**
