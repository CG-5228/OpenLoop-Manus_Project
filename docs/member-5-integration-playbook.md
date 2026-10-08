# Member 5 Integration Playbook

## Mission

Member 5 is the **release owner** for OpenLoop. The role is not primarily to build an isolated smart-resolution feature: it is to ensure that the five feature slices become one credible, public, working product before the deadline.

> **Operating rule:** Integration, a real end-to-end demo, and deployment are P0. Smart completion suggestions are P2 and begin only after P0 is green.

## How the roles fit together

| Member | Owns | What Member 5 must protect and verify |
|---|---|---|
| 1 — Dashboard & UI/UX | Landing/dashboard layout, commitment cards, filters, responsive states | Do not overwrite page layout. Verify the dashboard renders the real `Commitment[]` from the shared persistence hook and visibly handles loading, empty, and error states. |
| 2 — Conversation Processing | Paste/sample flow, user identity, parsing to `Message[]`, optional files | Verify `onImport` returns `{ messages, currentUserLabel, referenceDate? }`, and that the sample uses the same route as pasted input. |
| 3 — AI Commitment Extraction | Real server-side extraction endpoint | Confirm early that deployed credentials/provider access work. Verify the endpoint accepts the shared `Message[]`, returns evidence-backed `Commitment[]`, and fails honestly rather than silently substituting fixtures. |
| 4 — Commitment Management | `localStorage` persistence, complete/undo/dismiss/edit, optional follow-up | Verify `useCommitments()` exposes `commitments`, `addCommitments`, `updateCommitment`, and `dismissCommitment`; state must survive refresh. |
| 5 — Integration & Smart Resolution | Shared foundation/types, PR integration, QA, deployment, optional resolution | Keep contracts stable, merge small verified PRs, own the release checklist, and publish only what actually works. |

## Shared contracts: non-negotiable handshakes

- All branches import `src/types/openloop.ts`; no parallel lookalike types.
- `dueAt` is an ISO date/date-time or `null`; **overdue is computed**, not saved as a status.
- Relative dates such as “tomorrow” require a dated message or a supplied reference date; otherwise use `null`.
- Every `evidenceQuote` must appear in its cited source message.
- `unknown` direction is allowed; never silently treat an unfamiliar person as the current user.
- AI requests and responses are validated. A provider error is a clear visible error, not made-up success.

## Git workflow

### Branches

| Purpose | Branch |
|---|---|
| Shared starter baseline | `chore/bootstrap-foundation` → PR → `main` |
| Dashboard & UI | `feature/frontend` |
| Conversation import | `feature/conversation` |
| AI extraction | `feature/ai-extraction` |
| Persistence/actions | `feature/commitments` |
| Member 5’s feature work | `feature/resolution` |

### Rules

1. `main` must remain buildable. No force-pushes or direct experimental changes.
2. Every change starts from fresh `origin/main`, lives on its feature branch, and arrives through a small PR.
3. Before merging, the PR owner provides: scope summary, contract changes (if any), `npm run lint`, `npm run build`, and a brief manual smoke result.
4. Merge completed slices as they pass—not in a last-minute five-way merge.
5. When two PRs touch the same file, integrate the lower-risk contract or backend PR first, rebase the other author onto `main`, then resolve together.
6. Member 5 watches the PR queue and status at each integration checkpoint with `gh pr list`, `gh pr view`, `git fetch origin`, and the build command. Do not overwrite a teammate’s branch to “fix” it; leave review notes or create a narrowly scoped integration commit after merge.
7. **No self-merge or auto-merge.** Every PR, including Member 5’s, requests review from the other members. A teammate other than the author merges it, and only after approval and a green `npm run check`. Member 5 verifies each PR, comments on it, and requests reviews, but never merges.
8. To propose a fix on a teammate’s branch, open a separate branch and target a PR at their feature branch so the owner decides whether to accept it. Never push directly to another member’s branch.

## Integration cadence

### First block — establish the base

- Merge the shared Next.js foundation and `src/types/openloop.ts` into `main`.
- Tell every member the baseline commit SHA and their branch name.
- Member 3 and Member 5 verify a deployment-compatible server-side AI route/provider immediately.
- Agree that only Member 1 changes dashboard visual structure.

### Parallel build block — integrate continuously

- Ask for an early, narrow PR from each member as soon as their shared boundary exists.
- Merge the importer/parser and persistence hook as early as possible; these are the joints that make later work predictable.
- Merge the extraction API as soon as its live sample test works.
- After each merge, run `npm run check` and a short smoke pass on the shared journey.

### Release block — turn slices into a product

- Use the fictional sample conversation from `PROJECT_BRIEF.md` and run it through the real AI endpoint.
- Confirm four definite commitments: two **You Owe**, two **They Owe You**; exclude Sarah’s tentative statement; preserve Alex’s unknown due date.
- Confirm complete, undo, dismiss, deadline edit, and refresh persistence.
- Check desktop and phone viewports, no console errors, clear loading/error states, and a logged-out public deployment.
- Freeze P2 work when any P0 failure exists. Member 1 performs the final visual polish while Member 5 protects the working flow.

## How Member 5 maximises the team’s chance of winning

The judging weights are **Usefulness 40%**, **Clarity 30%**, and **Execution 30%**. The highest-leverage Member 5 actions are:

1. **Protect usefulness:** make “Try sample conversation” complete the journey without a login or private data. It must produce real AI-backed results with evidence and sensible uncertainty.
2. **Protect clarity:** make the first screen immediately say what OpenLoop does: *“Your conversations are full of promises. OpenLoop makes sure they aren’t forgotten.”* Keep the explainer honest about synthetic data and no messaging-platform integration.
3. **Protect execution:** run release gates early and repeatedly. A simple, fast, reliable app scores better than an impressive P2 feature that breaks the demo.
4. **Make the demo deterministic:** maintain one fictional sample, expected outcomes, and a fallback narrative that never claims hardcoded results are live AI.
5. **Be the communication hub:** publish the current baseline, PR status, blocker, and next integration decision at each checkpoint. Ask a blocked owner for the smallest mergeable slice, not a full rewrite.
6. **Deploy before the deadline pressure:** verify the production environment receives model credentials, the public URL works logged out, and the site explainer matches the delivered build.

## Smart Resolution: only when P0 is green

The optional endpoint is `POST /api/commitments/resolve` with:

```ts
{ messages: Message[]; commitments: Commitment[] }
```

It returns `{ suggestions: CompletionSuggestion[] }`. It compares later messages with existing commitments and suggests likely completion with source evidence. It **never automatically closes** an uncertain commitment; the user confirms the action.

## Release-owner stop rules

- Do not start P2 resolution while any P0 feature is unmerged, failing, or unverified.
- Do not merge any PR yourself; request review from the other members and let one of them merge.
- Do not claim real AI if a provider is unavailable.
- Do not expose API keys or commit `.env.local`.
- Do not add accounts, platform syncs, automatic messaging, or other out-of-scope work.
- Do not let visual polish displace the sample, extraction, persistence, or public deployment.
