# OpenLoop Team Status Board

Update this board at each integration checkpoint. Member 5 owns the release view; each feature owner keeps their own row current through PR descriptions and handoff notes.

**Merge policy:** no self-merges or auto-merges. Every PR requests review from the other members, and a teammate other than the author merges after approval and a green `npm run check`. (PRs #2 and #3 went in before this rule was adopted; PRs #5 and #7 were merged by their author. Please avoid this from now on.)

_Last refreshed: 8 Oct, 19:50 Dublin time. `main` = `1c999c4`._

| Area | Owner | State on `main` | Open PRs | Next release gate |
|---|---:|---|---|---|
| Shared foundation and types | 5 | ✅ Merged (PRs #2, #3, #4) | — | Keep `npm run check` green on every merge |
| Dashboard & UI/UX | 1 | ✅ Merged (PR #5). Still the labelled in-memory demo adapter | [#10](https://github.com/CG-5228/OpenLoop-Manus_Project/pull/10) (superseded once #12 merges) · [#11](https://github.com/CG-5228/OpenLoop-Manus_Project/pull/11) date-only deadlines (both by Member 5, awaiting Member 1 review) | Renders real persisted commitments |
| Conversation processing | 2 | ✅ Merged (PRs #1, #7); 32/32 module tests | [#8](https://github.com/CG-5228/OpenLoop-Manus_Project/pull/8) draft: `/dev/commitment-test` page | Importer mounted on `/import`: [#9](https://github.com/CG-5228/OpenLoop-Manus_Project/pull/9) |
| AI extraction | 3 | ✅ Merged (PR #6); 46/46 deterministic tests; live smoke 9/10 | — | **Production `OPENAI_API_KEY` missing**: production returns `503 AI_NOT_CONFIGURED` |
| Commitment management | 4 | 🟡 [#12](https://github.com/CG-5228/OpenLoop-Manus_Project/pull/12) ready for review: persistence, actions, `/api/follow-up`, live dashboard adapter. Verified end-to-end (see below) | [#12](https://github.com/CG-5228/OpenLoop-Manus_Project/pull/12) | Merge #12 |
| Resolution and release | 5 | Integration and QA; P2 on hold | [#9](https://github.com/CG-5228/OpenLoop-Manus_Project/pull/9), [#10](https://github.com/CG-5228/OpenLoop-Manus_Project/pull/10), [#11](https://github.com/CG-5228/OpenLoop-Manus_Project/pull/11) | P0 journey live on the production URL |

## Verified sample journey (local production build, real AI)

**With #12:** `main` + #12 + #9 + #10 + #11 merge cleanly and pass all checks. In a fresh browser, the sample import shows 4 open loops; a reload keeps all 4; Mark completed, then reload, keeps 3; **AI follow-up** `POST /api/follow-up` 200; re-importing the sample shows "already tracked" (BRIEF Test 7). One earlier attempt timed out on an import; the re-run passed.

**Earlier, without #12:** `main` + #9 + #10 + #11 merge cleanly and pass `npm run check`, 32/32 module tests and 46/46 AI tests. In a headless browser: landing → **Try sample conversation** → `/import` → **Send messages for analysis** → `POST /api/commitments/extract` **200** → `/dashboard` in about 16 s, showing **only the 4 real commitments** (2 you owe / 2 owed to you; Sarah's tentative CV promise excluded; 0 overdue).

## Integration checkpoints

- **Checkpoint 1 — baseline:** ✅ Starter app and contracts merged to `main`.
- **Checkpoint 2 — flow joints:** ✅ UI, importer and real extraction merged. 🟡 Importer mount in #9.
- **Checkpoint 3 — end-to-end:** 🟡 Sample → AI → storage → dashboard → action works locally with #12 + #9 + #11. Gate: merge them.
- **Checkpoint 4 — release:** ❌ The production URL is live, but AI extraction there needs `OPENAI_API_KEY`.

## Current Member 5 watch items

1. **Merge order:** #12 → #9 → #11 → #13. #10 is superseded by #12. Re-run `npm run check` whenever `main` moves.
2. **Deployment (owner CG-5228):** add a server-only `OPENAI_API_KEY` in Vercel for Production and Preview, then redeploy. Afterwards, run `OPENLOOP_TEST_ORIGIN=https://openloop-gules.vercel.app node tests/ai-extraction/live-smoke.mjs`.
3. **Member 4:** PR #12 delivers persistence and the live adapter. Review and merge it first. `/api/follow-up` uses the same `OPENAI_API_KEY`.
4. **Commit emails:** use `<numeric-id>+<login>@users.noreply.github.com`. The scientific-notation form (`2.38e+08+…`) is unverifiable, and Vercel blocks deploys for unverified authors. Members 2 and 3 still need this fix.
5. **Before submission:** the `/dev/conversation`, `/dev/text-parser` and (PR #8) `/dev/commitment-test` pages are publicly reachable. Keep them out of the demo path or remove them.
6. Don't start smart-resolution (P2) work while any P0 gate is still open.
