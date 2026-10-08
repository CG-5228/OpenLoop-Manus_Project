# Frontend (Member 1) — Integration Guide

**Branch:** `feature/frontend` · **Owner:** Member 1 (Dashboard & UI/UX)

This branch delivers the complete OpenLoop interface: landing page, app shell, dashboard, commitment cards, filters and search, commitment details, the import flow, and every loading, empty and error state. It is built on Member 5's foundation, uses only the shared contract in `src/types/openloop.ts`, and integrates Member 2's importer hook and Member 3's extraction endpoint.

## Routes

| Route | Purpose | Notes |
|---|---|---|
| `/` | Landing page | Primary CTA **Try sample conversation** → `/import?sample=1` |
| `/dashboard` | Stats, You Owe, They Owe You, All Commitments | URL state: `?view=you-owe\|they-owe\|all`, `?status=…`, `?q=…`, `?sort=…` |
| `/commitments/[id]` | Commitment details with evidence and actions | Not-found state for unknown IDs |
| `/import` | Paste or upload a conversation, choose who you are, analyse | `?sample=1` preloads Member 2's fictional sample |

Append `?demo-state=loading`, `?demo-state=empty` or `?demo-state=error` to any app URL to preview those states.

## End-to-end flow

1. **Import** (`src/components/import-flow/importer-slot.tsx`): OpenLoop's UI on top of Member 2's `useConversationImport` hook (parsing, sample, `.txt` reading, sender list, validation). The user picks which sender is them and can set a reference date.
2. **Analyse** (`use-import-flow.ts`): posts Member 2's payload to Member 3's `POST /api/commitments/extract`, shows analysing, no-results and error states (with retry), and keeps the pasted text when the user goes back to edit. It never substitutes fixture data.
3. **Store** (`src/lib/ui/commitment-store.ts`): commitments and their source messages are saved in this browser (`localStorage`, key `openloop:v1`) and synced across tabs. Re-importing the same conversation keeps existing statuses and edited deadlines because IDs are content-based.
4. **Track**: the dashboard, cards and details read everything through `useDashboardData()`.

## Extraction modes

`/api/commitments/extract` runs **AI extraction** when `OPENAI_API_KEY` is configured and **demo extraction** otherwise (`src/lib/ai/demo-extractor.ts`). `OPENLOOP_EXTRACTION_MODE=ai|demo` forces a mode. Demo extraction is rule-based: explicit first-person promises and short acceptances of a direct request, skipping hedges, negations and questions. Its candidates go through **the same server validation** as model output (exact evidence, beneficiary proof, deadline normalisation, direction, IDs). Responses carry `X-OpenLoop-Extraction: ai|demo` and the UI labels demo results. On Member 3's canonical sample, demo extraction returns the same four commitments the AI contract expects.

## The one data seam: `useDashboardData()`

Every UI component reads data and triggers actions through `useDashboardData()` (`src/components/providers/dashboard-data-provider.tsx`), whose shape is `DashboardDataApi` (`src/lib/ui/dashboard-data-api.ts`). The live adapter maps it onto the browser store. Follow-ups are template drafts (`followUpKind: "template"`, labelled in the dialog) because no follow-up endpoint exists; completion suggestions (optional P2) are not produced in this release. A server-backed store or an AI follow-up endpoint can replace these pieces inside the provider without changing any dashboard, card or detail component.

Date-only deadlines (`"2026-10-09"`) mean the end of that local day, so they are shown without a time and only become overdue after the day ends.

## Rules the UI enforces

- **Overdue** is derived from `dueAt` + `status` (`src/lib/ui/commitment-view.ts`); it is never stored.
- `direction: "unknown"` and low confidence are shown as **Needs review**, with an explanation on the card.
- Completion suggestions are never auto-applied; the user confirms or rejects.
- Follow-ups are drafts to copy. Nothing is sent automatically.

## Design system

Tokens live in `src/app/globals.css` (Tailwind v4 `@theme`). The type system is Geist (UI), Geist Mono (metadata) and Instrument Serif (display). Primitives are in `src/components/ui/` (Button, badges, Avatar, Dialog/Sheet, Menu, states). The brand mark is an open ring that "closes" when a loop is completed (`LoopCheck`).

## Verification

`npm run check` (lint + typecheck + build) passes, Member 3's suite (`node tests/ai-extraction/run.mjs`, now including demo-mode tests) passes 48/48, and Member 2's module check passes. A Playwright end-to-end run covers: empty dashboard → sample → analyse → dashboard with four commitments; persistence across reload; completion; details with evidence; labelled follow-up draft; a custom conversation (accepted request, hedge skipped); re-import without duplicates; and the no-results state with the text preserved, with no page errors.
