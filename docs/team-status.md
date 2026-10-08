# OpenLoop Team Status Board

Update this board at each integration checkpoint. Member 5 owns the release view; each feature owner keeps their own row current through PR descriptions and handoff notes.

**Merge policy:** no self-merges or auto-merges. Every PR requests review from the other members, and a teammate other than the author merges after approval and a green `npm run check`. (PRs #2 and #3 went in before this rule was adopted; PRs #5 and #7 were merged by their author. Please avoid this from now on.)

_Last refreshed: 8 Oct, 20:00 Dublin time, after PRs #8–#15. Every P0 module is merged. At the repository owner's request, the remaining open PRs were merged once the combined state passed every check._

| Area | Owner | State on `main` | Next release gate |
|---|---:|---|---|
| Shared foundation and types | 5 | ✅ Merged (PRs #2, #3, #4, #13, #14) | Keep `npm run check` green on every merge |
| Dashboard & UI/UX | 1 | ✅ Merged (PR #5, release integration PR #15) plus fixes #9, #10, #11 | — |
| Conversation processing | 2 | ✅ Merged (PRs #1, #7, #8); 46/46 module tests | — |
| AI extraction | 3 | ✅ Merged (PR #6); 48/48 tests including demo mode (#15) | Optional: `OPENAI_API_KEY` switches demo → AI |
| Commitment management | 4 | ✅ Merged (PR #12): persistence, actions, `/api/follow-up`, live dashboard adapter; 84/84 unit tests | Optional: same key enables AI follow-ups |
| Resolution and release | 5 | Integration and QA. P2 still on hold | — |

## Release mode: demo AI (no key)

The project has no AI key, so production runs in **demo mode** (PR #15):

- `POST /api/commitments/extract` uses a rule-based demo extractor whose candidates go through **the same server validation** as model output. Responses carry `X-OpenLoop-Extraction: demo` and the UI labels the results.
- `POST /api/follow-up` is called with `allowTemplate: true`, so it returns a template draft labelled in the dialog instead of a 503.
- Adding `OPENAI_API_KEY` in Vercel (Production and Preview) and redeploying switches both to real AI with no code change. `OPENLOOP_EXTRACTION_MODE=ai|demo` forces a mode.

## Verified P0 journey, demo mode (production build without a key, as on Vercel)

`npm run check` passes; AI tests 48/48, conversation 46/46, commitments 84/84. Headless browser, fresh profile:

| Step | Result |
|---|---|
| Fresh `/dashboard` | Honest empty state |
| Landing → Try sample → `/import?sample=1` | Sample preloaded, "Me" selected |
| Find commitments | **4 open loops** (2 you owe / 2 owed to you; tentative CV promise excluded), labelled demo extraction |
| Reload | Still 4 (**persisted**) |
| Mark completed, then reload | Persisted |
| Details → Draft follow-up | Evidence quote shown; draft labelled as a template |
| Custom conversation | Accepted request kept; hedge skipped |
| Re-import the same sample (BRIEF Test 7) | No duplicates; statuses kept |
| Text with no commitments | No-results state; pasted text preserved |
| `/dev/*` | 404 in production |

## Verified P0 journey, real AI (Member 5, local, `aa568e6`)

`POST /api/commitments/extract` 200 with the same 4 open loops in about 17 s; persistence, completion and re-import as above; `POST /api/follow-up` 200 with a grounded AI draft.

## Integration checkpoints

- **Checkpoint 1 — baseline:** ✅
- **Checkpoint 2 — flow joints:** ✅
- **Checkpoint 3 — end-to-end:** ✅ on `main` (demo mode, and real AI locally).
- **Checkpoint 4 — release:** ✅ https://openloop-gules.vercel.app deploys from `main` in demo mode, publicly accessible.

## Current Member 5 watch items

1. **Optional AI mode (owner CG-5228):** add a server-only `OPENAI_API_KEY` in Vercel for Production and Preview, redeploy, then run `OPENLOOP_TEST_ORIGIN=https://openloop-gules.vercel.app node tests/ai-extraction/live-smoke.mjs`.
2. **Before submission:** the explainer / demo script.
3. **Dev tools:** `/dev/*` pages are hidden in production unless `NEXT_PUBLIC_OPENLOOP_DEV_TOOLS=1` (`src/app/dev/layout.tsx`).
4. **Commit emails:** use `<numeric-id>+<login>@users.noreply.github.com`. Members 2 and 3 still use the unverifiable scientific-notation form.
5. **P2 Smart Resolution** can now start; it is optional.
