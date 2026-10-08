# Member 2 — Conversation import scaffold

## Scope

Create `feature/conversation` from the current `origin/main` and add only Member 2's module. The team added `PROJECT_BRIEF.md` during development; the feature branch incorporates that main-branch update and follows its component/data contracts. The repository still has no Next.js starter. Do not generate another app, add app routes, replace root configuration, implement AI extraction, or merge into `main`.

Follow the README's ownership paths: `src/components/import/` and `src/lib/conversation/`. Import `Message` from coordinator-owned `src/types/openloop.ts`; do not create a competing shared definition. The newer `PROJECT_BRIEF.md` and README use source `"txt"`; the older `BRIEF.md` uses `"text"` and lists `"pdf"`. This scaffold follows the newer contract.

## Implementation

Provide a composable `ConversationImporter` client component with separate text input, file upload, sender selection, optional conversation date, structured preview and a state hook. Its host callback receives `{ messages, currentUserLabel, referenceDate? }`, matching the new shared brief. Member 3, not this module, implements AI extraction; Member 1 controls the host page and dashboard.

The pure `parseConversation(input): Message[]` function accepts `Sender: message` and the README's ISO-timestamped pipe format, preserving multiple speakers and multiline content. Missing or timezone-ambiguous timestamps remain `null`; a host-provided explicit offset can resolve unzoned ISO timestamps. The optional user-controlled reference date is analysis context, not an invented message timestamp or deadline. The fictional sample supplies its explicitly stated date of 8 October 2026.

Pasted text, the fictional sample and UTF-8 `.txt` input use the same editable preview pipeline. Validate file extension, MIME type, size, UTF-8 encoding and nonempty content. Limit files to 5 MiB and conversations to 100,000 characters. Keep text files in the browser; do not persist or log their contents.

Define an injectable real OCR adapter. Screenshot import is disabled by default and clearly labelled as not connected; it becomes available only when the host supplies OCR. Extracted image text remains editable before submission. PDF and provider-specific chat formats remain out of scope.

## File structure

```text
docs/conversation/
  plan.md
  TODO.md
  README.md
src/components/import/
  ConversationImporter.tsx       # Public UI entry point
  ConversationTextInput.tsx      # Pasted/OCR text correction
  ConversationFileUpload.tsx     # Local upload controls
  ConversationDateInput.tsx      # Explicit optional context
  SenderSelector.tsx             # Current-user identity
  MessagePreview.tsx             # Structured messages
  useConversationImport.ts       # State and adapter handling
  index.ts
src/lib/conversation/
  types.ts                       # Feature-specific contracts
  parseConversation.ts           # Format parsing, never promise detection
  validateFile.ts
  readTextFile.ts
  ocr.ts                         # Optional real OCR boundary
  fixtures.ts                    # Fictional inputs, no AI results
  index.ts
tests/conversation/
  check-scaffold.py               # Repeatable isolated checks
  conversation.test.cjs           # Synthetic library/SSR tests
```

## Interface design

Use restrained productivity-tool styling: a vertically ordered input → preview → identity/date → submit flow, readable body text, indigo primary action, visible error/status text and accessible keyboard controls. Inherit the shared application's typography, spacing and Tailwind configuration; do not define a competing design system, logo, landing page or dashboard. No decorative imagery or animation is needed for this scaffold. Keep microcopy direct, such as “Review conversation text” and “Send messages for analysis.”

## Integration dependency

Member 5 must provide the Next.js/React/Tailwind starter and `src/types/openloop.ts`. Until then, the repeatable check uses a temporary shared contract extracted verbatim from `PROJECT_BRIEF.md`, outside the repository, with isolated React/TypeScript dependencies. This does not verify a complete app build, browser workflow or deployment. Real OCR and the extraction callback remain integration work. Commit/push the assigned feature branch and open a draft review PR without merging it.
