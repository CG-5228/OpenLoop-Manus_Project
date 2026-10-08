# Member 2 — Conversation import module

## Scope and current foundation

Work only on `feature/conversation`. Follow the README's ownership paths `src/components/import/` and `src/lib/conversation/`, preserving the app page/dashboard, AI routes and storage owned by teammates. Initial scaffolding was created before the shared application existed. On 8 October 2026, Member 5's starter/types reached `origin/main` at `787ae02d14faaa44e27970f5b37d002c7fdfa104`; incorporate that baseline into this feature branch rather than generating another app.

Import the canonical `Message` from `src/types/openloop.ts`. The newer shared brief, README and actual type file agree on `"paste" | "txt" | "image"`; do not follow the older brief's `"text"`/`"pdf"` mismatch. Shared configuration/types are inherited from Member 5, not reauthored by Member 2.

## Implementation

Provide `ConversationImporter({ onImport })` with separate editable text, file input, sender selection, optional conversation date, message preview and state hook. Its async callback receives `{ messages, currentUserLabel, referenceDate? }`; Member 3 owns real extraction and Member 1 controls the host page. Sample/custom imports use the same callback without hardcoded commitments.

The baseline format parser accepts `Sender: message` and supported ISO-timestamped pipe lines, preserving multiple speakers and multiline content. Unzoned/invalid/missing timestamps stay null unless a known offset is explicitly supplied. Reference date is user-provided context, never an invented timestamp/deadline. The sample carries its explicit date `2026-10-08`.

Pasted input and UTF-8 `.txt` files use the editable preview pipeline. Validate supported extensions/MIME, size, encoding and content. Limit uploads to 5 MiB and conversation text to 100,000 characters. Keep text files in the browser; do not persist or log message bodies.

Keep real OCR injectable. Screenshot availability is explicit and disabled without an adapter; returned OCR text remains editable. PDF and provider-specific export formats are optional, not prerequisites for the P0 demo.

## Structure

| Directory | Responsibility |
| --- | --- |
| `src/components/import/` | Importer, text/file/date inputs, sender selector, preview and state hook. |
| `src/lib/conversation/` | Parser, validation/readers, OCR boundary, module contracts and fictional input. |
| `tests/conversation/` | Repeatable temporary-workspace compilation and synthetic/SSR tests. |
| `docs/conversation/` | Guide, this plan, checklist, Member 2 progress and Member 3 handoff. |

## Interface design

Use a vertically ordered input → preview → identity/date → submit flow, readable copy, indigo primary action, visible error/status text and keyboard-accessible controls. Inherit the shared application's typography/Tailwind system. Do not create a competing landing page, dashboard, branding or design system. No decorative imagery or animation is needed for this module.

## Verification and integration stage

Canonical-type module compilation and all 25 synthetic/SSR tests pass. Shared lint, TypeScript checking and the Next.js production build also pass. Initial lint incompatibilities were corrected only in Member 2's JSX/test files.

Build compatibility is not end-to-end acceptance. The importer is not mounted in the app page, the fetched extraction route is absent, and no real OCR is connected. Next, hand Member 3 the exact request/response contract, let Member 1 mount the component, and coordinate AI → storage → dashboard wiring with Members 3/4/5. Verify the real browser/public journey before optional OCR/PDF work. Commit/push the assigned feature branch and update the draft PR; do not merge into `main` from this task.

## Parser playground

Add a narrowly scoped `/dev/conversation` test page using the actual Member 2 component and parser. Keep the existing root page/dashboard untouched. The playground's callback only displays the structured payload in browser memory; it never calls AI, saves messages or pretends commitments were detected. Override the submit label and disclosure for this test context while preserving their product defaults. Include the route in the static page manifest.

Expose the current feature branch through a temporary sandbox preview on port 3000, bound to `0.0.0.0`. Verify HTTP access locally/publicly and try synthetic sample, custom text and `.txt` input in the browser before delivery. Treat the playground as a testing utility, not a deployed product or live extraction endpoint.

The playground is now verified using the production build locally and at the temporary public sandbox URL. Real-browser sample/custom/UTF-8 upload/unsupported-file/known-offset checks passed, with no commitment API requests. The mounted page exposed a prerender restriction on initial `crypto.randomUUID()`; defer initial conversation IDs to input events and retain a regression test. This clears the isolated browser-parser test gate only, not product page integration, live AI or real OCR.

## Direct text-to-output interface

Add a reusable quick parser UI at `/dev/text-parser` and use it as the managed deployment copy's homepage. A whole-block mode preserves unstructured email/page text without interpreting headers as people; an explicit `Name: message` mode reuses the existing conversation parser. A known author is optional and never inferred. The Parse text action returns readable `Message[]` plus JSON without current-user gating. Keep the existing advanced importer unchanged, and explicitly state no AI meaningful-promise detection, persistence, OCR or Gmail account connection. Only Member 2 files and the new dev route change on feature/conversation.

## Newly available live extraction test

Member 3 pushed `feature/ai-extraction` during this test-interface task. Reuse that actual endpoint unchanged in a detached integration worktree, not in shared main. Add a Member 2 test harness at `/dev/commitment-test`: text input, whole-block/labelled format, explicit current user, optional author/date, a deliberate Find commitments action, loading/errors, returned commitment records/evidence and raw JSON. This is now a separate **real AI** test view; disclose that clicking Find commitments transmits text to the server/configured model provider. Do not persist it or connect Gmail. The existing parser-only managed homepage remains separate and retains its accurate no-AI disclosure. Use the configured sandbox credential only server-side for this temporary test; it is not copied into the managed static website or promised as permanent deployed inference.

## Email-list selection and filtering

Extend Member 2's module with `emailList.ts` for validated list import, search/sender/date filtering and conversion to canonical source messages, plus `EmailSelectionPlayground` at `/dev/email-selection`. Accept a JSON array of `{ id?, from, to?, subject?, body, sentAt? }` or email blocks separated by `===EMAIL===` with From/To/Subject/Date headers. Support paste or local UTF-8 .txt/.json upload, fictional sample, sender/search/date filters, per-email checkboxes and select/deselect visible emails. Do not infer account permissions or connect Gmail.

For automatic relevance, reuse Member 3's existing extraction endpoint: AI-select evaluates the currently visible email set and selects the exact source emails for returned commitments; non-promises remain unselected. Relevance specifically means evidence-backed commitments, not every possible business priority. Manual analysis submits selected visible emails only; hidden/unselected email bodies are not transmitted. Output groups commitments by original email and preserves source IDs/subject/evidence, with no storage or sending. Current-user identity is explicit, dates are only explicit zoned timestamps or supplied reference context, and failed analysis never silently produces recommendations. Limits are 100 emails, 100,000 aggregate body/context characters and 1 MiB raw list import. Work on feature/conversation, preserve other members' APIs and update the isolated live test runtime without broad public publishing.

Email AI actions analyse each email independently through the existing endpoint (two requests at a time, up to 10 emails per action), so an unrelated message cannot provide misleading acceptance/fulfilment context. Import can hold 100 emails; users narrow larger lists with local filters or select up to 10. Preserve per-email failures distinctly, report progress, and never label a failed/unanalysed email as irrelevant. Suggestions mean “contains a definite commitment” and are reviewable, not a guarantee of relevance.

## Requested landing-page positioning change

The user now asks to replace import-first marketing with automatic reading of emails, university websites and tickets, followed by calendar entries. This turn changes landing-page text and its description only; it does not build mailbox/web monitoring or calendar integrations. Keep the existing layout, routes, current demo and teammates' functionality intact. Position the hero and related steps/features around that intended experience, use an explicit “being built / planned” qualifier, and distinguish the existing imported-conversation demo from forthcoming automatic source connections and calendar sync. Preserve the current user-consent and source-evidence themes. Save on feature/conversation for team review, not a direct shared-main merge or public deployment.
