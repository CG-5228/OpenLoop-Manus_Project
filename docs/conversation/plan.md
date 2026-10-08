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
