# Frontend (Member 1) — Integration Guide

**Branch:** `feature/frontend` · **Owner:** Member 1 (Dashboard & UI/UX)

This branch delivers the complete OpenLoop interface: landing page, app shell, dashboard, commitment cards, filters and search, commitment details, import page frame, and every loading, empty and error state. It is built on Member 5's foundation and imports **only** the shared contract in `src/types/openloop.ts`.

## Routes

| Route | Purpose | Notes |
|---|---|---|
| `/` | Landing page | Primary CTA **Try sample conversation** → `/import` |
| `/dashboard` | Stats, You Owe, They Owe You, All Commitments | URL state: `?view=you-owe\|they-owe\|all`, `?status=…`, `?q=…`, `?sort=…` |
| `/commitments/[id]` | Commitment details with evidence and actions | Not-found state for unknown IDs |
| `/import` | Import page frame and analysis states | Member 2's importer mounts here |

Append `?demo-state=loading`, `?demo-state=empty` or `?demo-state=error` to any app URL to preview those states.

## The one data seam: `useDashboardData()`

Every UI component reads data and triggers actions through `useDashboardData()` (`src/components/providers/dashboard-data-provider.tsx`), whose shape is `DashboardDataApi` (`src/lib/ui/dashboard-data-api.ts`). It currently runs a **clearly labelled demo adapter** over synthetic fixtures (`src/lib/mock/demo-data.ts`). The UI shows a "Demo mode" indicator while it is active, and nothing is persisted.

To go live, add a `useLiveAdapter()` in the provider that maps the teammates' modules onto the same shape and returns `mode: "live"`:

| `DashboardDataApi` | Backed by |
|---|---|
| `commitments` | Member 4 — `useCommitments().commitments` |
| `addCommitments(list, messages?)` | Member 4 — `addCommitments(list)` |
| `markCompleted(id)` / `restore(id)` / `updateDeadline(id, dueAt)` | Member 4 — `updateCommitment(id, { status \| dueAt })` |
| `dismiss(id)` | Member 4 — `dismissCommitment(id)` |
| `generateFollowUp(c)` | Member 4 — `POST /api/follow-up` via `requestFollowUp()` in `src/lib/ui/api-client.ts` |
| `suggestions`, `confirmSuggestion`, `rejectSuggestion` | Member 5 — `POST /api/commitments/resolve` (optional, P2) |
| `getMessage(id)` | Stored source messages, if kept; evidence still renders from `evidenceQuote` without it |

No dashboard, card or detail component needs to change when the adapter is swapped.

## Mounting the conversation importer (Member 2)

When PR #1 (`feature/conversation`) is on `main`, edit **one file**, `src/components/import-flow/importer-slot.tsx`:

```tsx
import { ConversationImporter } from "@/components/import";
return <ConversationImporter onImport={onImport} />;
```

`onImport` is provided by `useImportFlow()` (`src/components/import-flow/use-import-flow.ts`). It takes Member 2's `{ messages, currentUserLabel, referenceDate? }`, calls Member 3's `POST /api/commitments/extract`, stores the results with `addCommitments`, and opens the dashboard with a summary toast. It shows analysing, no-results and error states (with retry), and **never** substitutes fixture data when the endpoint fails.

## Rules the UI enforces

- **Overdue** is derived from `dueAt` + `status` (`src/lib/ui/commitment-view.ts`); it is never stored.
- `direction: "unknown"` and low confidence are shown as **Needs review**, with an explanation on the card.
- Completion suggestions are never auto-applied; the user confirms or rejects.
- Follow-ups are drafts to copy. Nothing is sent automatically.

## Design system

Tokens live in `src/app/globals.css` (Tailwind v4 `@theme`). The type system is Geist (UI), Geist Mono (metadata) and Instrument Serif (display). Primitives are in `src/components/ui/` (Button, badges, Avatar, Dialog/Sheet, Menu, states). The brand mark is an open ring that "closes" when a loop is completed (`LoopCheck`).

## Verification

`npm run check` (lint + typecheck + build) passes. A Playwright interaction suite (19 checks) covers stats, complete/undo, search, filters, view tabs, follow-up and deadline dialogs, suggestion confirm, dismiss, details navigation and the mobile navigation sheet, with no page errors.
