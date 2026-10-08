# Member 2 outcomes

## Module scaffold

- [x] Work on `feature/conversation`, using only Member 2's ownership paths, with no new standalone application or edits to other features.
- [x] Provide `ConversationImporter({ onImport })` for pasted text and a fictional sample, with editable content, structured preview, multiple speakers, current-user identification and optional explicit reference date.
- [x] Provide `.txt` upload validation and UTF-8 reading, rejecting unsupported, empty, binary, oversized or incorrectly encoded inputs with clear errors.
- [x] Parse content into the shared `Message[]` contract, preserving sender, content, conversation ID, original source and known timestamps; use `null` rather than inventing missing/ambiguous dates.
- [x] Provide an explicit OCR adapter boundary; disable screenshots until real OCR is supplied, and keep extracted text editable before analysis.
- [x] Document dependencies and module exports, and include synthetic tests and a repeatable isolated check without adding an application starter or competing shared types.

The checked items represent **source scaffolding**, supported by isolated TypeScript and synthetic/SSR tests. They do not establish a complete app build, live browser acceptance, deployed AI or real OCR quality. Delivery follows the repository's commit/push/pull-request workflow; no merge into `main` is performed by Member 2.

## Subsequent integration — not completed by the scaffold

- [ ] Member 5 supplies the Next.js/React/Tailwind starter and canonical `src/types/openloop.ts`, using the newer shared brief's `"txt"` source contract.
- [ ] Member 1 mounts `ConversationImporter` in the shared application and aligns its styling with the dashboard.
- [ ] The host callback sends structured messages, `currentUserLabel` and optional `referenceDate` to Member 3's real extraction endpoint, preserving server errors and loading states.
- [ ] Connect and verify a real OCR implementation, including preview/correction of screenshot text.
- [ ] Verify the integrated application build and end-to-end import workflow. PDF support is optional and not implemented here.
