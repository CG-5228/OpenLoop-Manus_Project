# OpenLoop Team Status Board

Update this board at each integration checkpoint. Member 5 owns the release view; each feature owner keeps their own row current through PR descriptions and handoff notes.

**Merge policy:** no self-merges or auto-merges. Every PR requests review from the other members, and a teammate other than the author merges after approval and a green `npm run check`. (PRs #2 and #3 went in before this rule was adopted; PRs #5 and #7 were merged by their author. Please avoid this from now on.)

_Last refreshed: 8 Oct, 19:54 Dublin time. `main` = `aa568e6`. Every P0 module is merged._

| Area | Owner | State on `main` | Next release gate |
|---|---:|---|---|
| Shared foundation and types | 5 | ✅ Merged (PRs #2, #3, #4, #13) | Keep `npm run check` green on every merge |
| Dashboard & UI/UX | 1 | ✅ Merged (PR #5) plus fixes #9 (importer mounted), #10 and #11 (date-only deadlines) | Phone-viewport pass before submission |
| Conversation processing | 2 | ✅ Merged (PRs #1, #7, #8); 46/46 module tests | Keep `/dev/*` pages out of the demo path |
| AI extraction | 3 | ✅ Merged (PR #6); 46/46 deterministic tests | **Production `OPENAI_API_KEY`** |
| Commitment management | 4 | ✅ Merged (PR #12): persistence, actions, `/api/follow-up`, live dashboard adapter | **Production `OPENAI_API_KEY`** (same key) |
| Resolution and release | 5 | Integration and QA. P2 still on hold | P0 live on the production URL |

## Verified P0 journey on `main` `aa568e6` (local production build, real AI)

Fresh `npm ci`; `npm run check` passes; module tests 46/46; AI tests 46/46. Headless browser, fresh profile, Europe/Dublin time zone:

| Step | Result |
|---|---|
| Fresh `/dashboard` | Honest empty state; live mode, no demo data |
| Try sample → Send for analysis | `POST /api/commitments/extract` 200; dashboard in about 17 s with **4 open loops** (2 you owe / 2 owed to you; tentative CV promise excluded) |
| Reload | Still 4 (**persisted**); "Send Sarah the slides" not overdue |
| Mark completed, then reload | 3, persisted |
| Follow up | `POST /api/follow-up` 200; grounded AI draft |
| Re-import the same sample (BRIEF Test 7) | Still 3; "already tracked" toast |

## Integration checkpoints

- **Checkpoint 1 — baseline:** ✅
- **Checkpoint 2 — flow joints:** ✅
- **Checkpoint 3 — end-to-end:** ✅ on `main`, locally, with real AI.
- **Checkpoint 4 — release:** ❌ https://openloop-gules.vercel.app serves `aa568e6` UI, but `GET /api/follow-up` returns `{"aiConfigured":false}`, so extraction returns `503 AI_NOT_CONFIGURED`.

## Current Member 5 watch items

1. **Release blocker (owner CG-5228):** add a server-only `OPENAI_API_KEY` in Vercel → Project → Settings → Environment Variables for Production and Preview, then redeploy. Afterwards, run `OPENLOOP_TEST_ORIGIN=https://openloop-gules.vercel.app node tests/ai-extraction/live-smoke.mjs`.
2. **After production is green:** a phone-viewport pass, error states (`?demo-state=error`), and the explainer / demo script.
3. **Before submission:** `/dev/conversation`, `/dev/text-parser`, `/dev/commitment-test` and `/dev/commitments` are publicly reachable. Keep them out of the demo path or remove them.
4. **Commit emails:** use `<numeric-id>+<login>@users.noreply.github.com`. Members 2 and 3 still use the unverifiable scientific-notation form.
5. **P2 Smart Resolution** may start only after Checkpoint 4 is green.
