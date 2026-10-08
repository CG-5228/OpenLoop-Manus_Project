# OpenLoop Team Status Board

Update this board at each integration checkpoint. Member 5 owns the release view; each feature owner keeps their own row current through PR descriptions and handoff notes.

**Merge policy:** no self-merges or auto-merges. Every PR requests review from the other members, and a teammate other than the author merges after approval and a green `npm run check`. (PRs #2 and #3 went in before this rule was adopted.)

| Area | Owner | Branch | Current state | PR / commit | Integration dependency | Next release gate |
|---|---:|---|---|---|---|---|
| Shared foundation and types | 5 | `main` | **Merged and build-verified** | [PR #2](https://github.com/CG-5228/OpenLoop-Manus_Project/pull/2) · `902ca3c` | None | Keep `npm run check` green on every merge |
| Dashboard & UI/UX | 1 | `feature/frontend` | **Ready for review; full check passes in a prospective merge with `main`.** Dashboard still uses the labelled demo adapter | [PR #5](https://github.com/CG-5228/OpenLoop-Manus_Project/pull/5) · `c92b58a` | Reviewer approval; Member 4's live adapter replaces demo data | Renders real persisted commitments; importer mounted in `ImporterSlot` |
| Conversation processing | 2 | `feature/conversation` | **Full check passes; module tests 28/28.** Still a draft, with reviews requested. Conflicts with PR #5 in `public/manus-routes.json` | [PR #1](https://github.com/CG-5228/OpenLoop-Manus_Project/pull/1) · `57b2892` | After PR #5 merges, a Member 5 fix PR into this branch resolves the routes conflict | Importer mounted on the page and connected to the extraction endpoint |
| AI extraction | 3 | `feature/ai-extraction` | No remote branch yet; the sandbox provider probe passed | — | Server-only credential in the production environment | Real endpoint handles the sample honestly |
| Commitment management | 4 | `feature/commitments` | No remote branch yet | — | Shared types | Actions persist through a page refresh |
| Resolution and release | 5 | `feature/resolution` | Integration and QA; P2 work intentionally on hold | `feature/resolution` | P0 journey green first | Optional suggestions only after P0 |

## Integration checkpoints

- **Checkpoint 1 — baseline:** ✅ Starter app and contracts merged to `main`.
- **Checkpoint 2 — flow joints:** 🟡 UI (PR #5) and importer (PR #1) both verified. Extraction route and persistence hook not yet pushed.
- **Checkpoint 3 — end-to-end:** The sample → AI → storage → dashboard → action flow works on `main`.
- **Checkpoint 4 — release:** Phone viewport, error states, public deployment and explainer all verified.

## Current Member 5 watch items

1. Suggested merge order: PR #5 first, then PR #1 once a fix PR into `feature/conversation` resolves `public/manus-routes.json` to the union of both route lists. Re-run `npm run check` whenever `main` moves.
2. Members 3 and 4: push early, narrow PRs, prioritising Member 3's extraction endpoint and production credential, and Member 4's `useCommitments()` live adapter to replace the demo data.
3. **Commit emails:** use `<numeric-id>+<login>@users.noreply.github.com`. The scientific-notation form (`1.99e+08+…`) is unverifiable, and Vercel blocks deploys for unverified authors.
4. Before every review recommendation, fetch `origin/main` and run the full check on the prospective merge.
5. Don't start smart-resolution work while any P0 gate is still open.
