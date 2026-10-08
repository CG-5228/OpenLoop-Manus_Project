# OpenLoop Team Status Board

Update this board at each integration checkpoint. Member 5 owns the release view; each feature owner keeps their own row current through PR descriptions and handoff notes.

**Merge policy:** no self-merges or auto-merges. Every PR requests review from the other members, and a teammate other than the author merges after approval and a green `npm run check`. (PRs #2 and #3 went in before this rule was adopted.)

| Area | Owner | Branch | Current state | PR / commit | Integration dependency | Next release gate |
|---|---:|---|---|---|---|---|
| Shared foundation and types | 5 | `main` | **Merged and build-verified** | [PR #2](https://github.com/CG-5228/OpenLoop-Manus_Project/pull/2) · `902ca3c` | None | Keep `npm run check` green on every merge |
| Dashboard & UI/UX | 1 | `feature/frontend` | **Ready for review; full check passes.** Adds CI and a Vercel deploy workflow. Dashboard still uses the labelled demo adapter | [PR #5](https://github.com/CG-5228/OpenLoop-Manus_Project/pull/5) · `e82c025` | Reviewer approval; Member 4's live adapter replaces demo data | Renders real persisted commitments; importer mounted in `ImporterSlot` |
| Conversation processing | 2 | `feature/conversation` | **Full check passes; module tests 32/32.** Still a draft. Conflicts with PR #5 in `public/manus-routes.json` | [PR #1](https://github.com/CG-5228/OpenLoop-Manus_Project/pull/1) · `d22be81` | After PR #5 merges, a Member 5 fix PR into this branch resolves the routes conflict | Importer mounted on the page and connected to the extraction endpoint |
| AI extraction | 3 | `feature/ai-extraction` | **Ready for review; full check passes; 46/46 deterministic tests.** With PR #5: clean merge; live smoke 9/10 with real AI (shared sample passes; one case non-deterministic) | [PR #6](https://github.com/CG-5228/OpenLoop-Manus_Project/pull/6) · `0b49b36` | `OPENAI_API_KEY` in Vercel Production + Preview; `VERCEL_TOKEN` repository secret | Live smoke passes against the production URL |
| Commitment management | 4 | `feature/commitments` | No remote branch yet | — | Shared types | Actions persist through a page refresh |
| Resolution and release | 5 | `feature/resolution` | Integration and QA; P2 work intentionally on hold | `feature/resolution` | P0 journey green first | Optional suggestions only after P0 |

## Integration checkpoints

- **Checkpoint 1 — baseline:** ✅ Starter app and contracts merged to `main`.
- **Checkpoint 2 — flow joints:** 🟡 UI (PR #5), importer (PR #1) and real extraction (PR #6) all verified. Member 4's persistence hook not yet pushed.
- **Checkpoint 3 — end-to-end:** The sample → AI → storage → dashboard → action flow works on `main`.
- **Checkpoint 4 — release:** Phone viewport, error states, public deployment and explainer all verified.

## Current Member 5 watch items

1. Suggested merge order: **PR #5 → PR #6 → PR #1** (after a fix PR into `feature/conversation` resolves `public/manus-routes.json`). Re-run `npm run check` whenever `main` moves.
2. **Member 4** (no branch yet): `useCommitments()` with persistence and the live dashboard adapter. This is now the biggest P0 gap.
3. **Deployment (owner CG-5228):** add the `VERCEL_TOKEN` repository secret and a server-only `OPENAI_API_KEY` in Vercel. Production URL: https://openloop-gules.vercel.app.
4. **Commit emails:** use `<numeric-id>+<login>@users.noreply.github.com`. The scientific-notation form (`1.99e+08+…`) is unverifiable, and Vercel blocks deploys for unverified authors. Members 2 and 3 still need this fix.
5. Before every review recommendation, fetch `origin/main` and run the full check on the prospective merge.
6. Don't start smart-resolution work while any P0 gate is still open.
