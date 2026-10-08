# OpenLoop Team Status Board

Update this board at each integration checkpoint. Member 5 owns the release view; each feature owner keeps their own row current through PR descriptions and handoff notes.

**Merge policy:** no self-merges or auto-merges. Every PR requests review from the other members, and a teammate other than the author merges after approval and a green `npm run check`. (PRs #2 and #3 went in before this rule was adopted.)

| Area | Owner | Branch | Current state | PR / commit | Integration dependency | Next release gate |
|---|---:|---|---|---|---|---|
| Shared foundation and types | 5 | `main` | **Merged and build-verified** | [PR #2](https://github.com/CG-5228/OpenLoop-Manus_Project/pull/2) · `902ca3c` | None | Keep `npm run check` green on every merge |
| Dashboard & UI/UX | 1 | `feature/frontend` | No remote branch yet | — | Shared types + hook contract; mounts Member 2's importer | Renders real commitments and all UI states |
| Conversation processing | 2 | `feature/conversation` | **Lint fixed; full check passes in a prospective merge with `main`.** Still a draft, with reviews requested | [PR #1](https://github.com/CG-5228/OpenLoop-Manus_Project/pull/1) · `3a903e0` | Member 2 marks it ready; a teammate approves and merges | Importer mounted on the page and connected to the extraction endpoint |
| AI extraction | 3 | `feature/ai-extraction` | No remote branch yet; the sandbox provider probe passed | — | Server-only credential in the production environment | Real endpoint handles the sample honestly |
| Commitment management | 4 | `feature/commitments` | No remote branch yet | — | Shared types | Actions persist through a page refresh |
| Resolution and release | 5 | `feature/resolution` | Integration and QA; P2 work intentionally on hold | `feature/resolution` | P0 journey green first | Optional suggestions only after P0 |

## Integration checkpoints

- **Checkpoint 1 — baseline:** ✅ Starter app and contracts merged to `main`.
- **Checkpoint 2 — flow joints:** 🟡 Importer ready for review (PR #1). Extraction route and persistence hook not yet pushed.
- **Checkpoint 3 — end-to-end:** The sample → AI → storage → dashboard → action flow works on `main`.
- **Checkpoint 4 — release:** Phone viewport, error states, public deployment and explainer all verified.

## Current Member 5 watch items

1. PR #1: wait for Member 2 to mark it ready and a teammate to approve and merge. Re-run `npm run check` if `main` moves first.
2. Members 1, 3 and 4: confirm their branch names and push early, narrow PRs, prioritising Member 3's extraction endpoint and production credential.
3. Before every review recommendation, fetch `origin/main` and run the full check on the prospective merge.
4. Don't start smart-resolution work while any P0 gate is still open.
