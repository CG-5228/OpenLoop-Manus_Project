# OpenLoop Team Status Board

Update this board at each integration checkpoint. Member 5 owns the release view; each feature owner keeps their own row current through PR descriptions and handoff notes.

| Area | Owner | Branch | Current state | PR / commit | Integration dependency | Next release gate |
|---|---:|---|---|---|---|---|
| Shared foundation and types | 5 | `chore/bootstrap-foundation` | In progress | Pending first PR | None | `npm run check` passes on `main` |
| Dashboard & UI/UX | 1 | `feature/frontend` | Not started | — | Shared types + hook contract | Renders real commitments and states |
| Conversation processing | 2 | `feature/conversation` | Not started | — | Shared types | Emits valid `Message[]` and uses real route |
| AI extraction | 3 | `feature/ai-extraction` | Not started | — | Shared types + provider credentials | Real endpoint handles sample honestly |
| Commitment management | 4 | `feature/commitments` | Not started | — | Shared types | Actions persist through refresh |
| Resolution and release | 5 | `feature/resolution` | Waiting for P0 integration | — | P0 journey green | Optional suggestions only after P0 |

## Integration checkpoints

- **Checkpoint 1 — baseline:** starter app and contracts merged to `main`.
- **Checkpoint 2 — flow joints:** importer, extraction route, and persistence hook have mergeable interfaces.
- **Checkpoint 3 — end-to-end:** sample → AI → storage → dashboard → action works on `main`.
- **Checkpoint 4 — release:** phone viewport, errors, public deployment, and explainer verified.
