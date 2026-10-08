# OpenLoop Team Status Board

Update this board at each integration checkpoint. Member 5 owns the release view; each feature owner keeps their own row current through PR descriptions and handoff notes.

**Merge policy:** no self-merges or auto-merges. Every PR requests review from the other members, and a teammate other than the author merges after approval and a green `npm run check`. (PRs #2 and #3 went in before this rule was adopted; PRs #5 and #7 were merged by their author. Please avoid this from now on.)

_Last refreshed: 8 Oct, 19:55 Dublin time, after PRs #8–#13 and the release integration PR. At the repository owner's request, all open PRs were merged after the combined state passed every check._

| Area | Owner | State on `main` | Open PRs | Notes |
|---|---:|---|---|---|
| Shared foundation and types | 5 | Merged (PRs #2, #3, #4) | — | Keep `npm run check` green on every merge |
| Dashboard & UI/UX | 1 | Merged (PR #5 + release integration PR) | — | Designed importer on Member 2's hook; follow-ups labelled by source |
| Conversation processing | 2 | Merged (PRs #1, #7, #8); 46/46 module tests | — | Importer hook powers `/import` |
| AI extraction | 3 | Merged (PR #6); 48/48 tests including demo mode | — | No AI key in production, so labelled **demo extraction** runs through the same validation |
| Commitment management | 4 | Merged (PR #12); 84/84 unit tests | — | Browser persistence, live adapter, `/api/follow-up` with labelled template fallback |
| Resolution and release | 5 | Merged (PRs #9, #10, #11, #13) | — | P2 suggestions not in this release |

## Verified release journey (production build, no AI key, as on Vercel)

Landing → **Try sample conversation** → `/import?sample=1` (sample preloaded, "Me" selected) → **Find commitments** → `/dashboard` with the **4 expected commitments** (2 you owe, 2 owed to you; Sarah's tentative CV promise excluded). Then: persistence through a reload, completion persists, details show the exact evidence, the follow-up draft is labelled as a template, a custom conversation works (accepted request kept, hedge skipped), re-import adds no duplicates, and the no-results state keeps the pasted text. No page errors.

## Integration checkpoints

- **Checkpoint 1 — baseline:** done.
- **Checkpoint 2 — flow joints:** done. Importer, extraction, persistence and follow-ups are all on `main`.
- **Checkpoint 3 — end-to-end:** done. Sample → extraction → storage → dashboard → actions, persisted across refresh.
- **Checkpoint 4 — release:** production deploys from `main` and is **public** (Vercel deployment protection disabled). It runs in demo-extraction mode because there is no AI key.

## Watch items

1. **AI mode (optional):** add a server-only `OPENAI_API_KEY` in Vercel (Production and Preview) and redeploy. Extraction and follow-ups then switch to AI automatically. Afterwards, run `OPENLOOP_TEST_ORIGIN=https://openloop-gules.vercel.app node tests/ai-extraction/live-smoke.mjs`.
2. **Dev tools:** `/dev/*` pages are hidden in production unless `NEXT_PUBLIC_OPENLOOP_DEV_TOOLS=1` (`src/app/dev/layout.tsx`).
3. **Commit emails:** use `<numeric-id>+<login>@users.noreply.github.com`. Vercel blocks deploys from unverified authors.
4. Re-run `npm run check` plus the module suites (`node tests/ai-extraction/run.mjs`, `python3 tests/conversation/check-scaffold.py`, `npx -y tsx --test src/lib/commitments/__tests__/*.test.ts`) whenever `main` moves.
