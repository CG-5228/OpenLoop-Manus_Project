# Member 2 outcomes

## Module implementation and foundation compatibility

- [x] Work on `feature/conversation`, using only Member 2's feature paths and preserving other members' modules.
- [x] Provide `ConversationImporter({ onImport })` for pasted text and the fictional sample, with editable content, structured preview, multiple speakers, user identification and optional explicit reference date.
- [x] Provide `.txt` validation and UTF-8 reading with clear unsupported/empty/binary/size/encoding errors.
- [x] Parse into canonical `Message[]`, preserving sender/content/IDs/source and known timestamps; never invent ambiguous dates.
- [x] Provide an honest optional OCR adapter boundary and editable extracted text; disable screenshots without real OCR.
- [x] Document exports, source boundaries and tests; provide Member 3's exact extraction handoff.
- [x] Bring Member 5's actual app starter and `src/types/openloop.ts` from `main` into this branch, without redefining types.
- [x] Pass 32 module tests with canonical types and the shared lint, TypeScript and Next.js production-build checks.

These checks establish implementation/build compatibility and the explicitly listed synthetic browser workflows, not real OCR, deployed inference or a complete product demo. PR #1 remains a draft; no merge into `main` is performed by Member 2.

## Remaining integration

- [ ] Member 1 mounts `ConversationImporter` and aligns styling with the dashboard.
- [ ] Wire the host callback to Member 3's real extraction endpoint, preserving `messages`, `currentUserLabel`, optional `referenceDate`, loading and errors.
- [ ] Members 1/4/5 connect returned commitments to persistence/dashboard and verify the full sample/custom import journey in a browser, including phone layout.
- [ ] Member 5 coordinates review/merge and verifies the deployed flow.
- [ ] Connect and test a real OCR implementation if the P0 text-to-AI flow is working. PDF and richer chat-format parsing remain optional.

## Interactive parser test preview

- [x] Provide `/dev/conversation` with the actual importer and structured JSON output, clearly labelled parser-only with no AI/network submission of input.
- [x] Allow sample, pasted text and `.txt` uploads to be tested without modifying the dashboard or other members' features.
- [x] Verify the preview via local/public HTTP and synthetic browser input, while keeping real OCR and AI extraction explicitly unavailable.

## Quick text-output interface

- [x] Provide a whole-block / explicit chat-label paste interface and Parse text action, with optional known author and no required current-user identity.
- [x] Show readable Message records and JSON, with unknown timestamps/senders preserved honestly and input edits flagged until re-parsed.
- [x] Preserve the advanced importer and clearly separate this parser test from AI commitment detection and Gmail/OCR integration.

The quick interface is at `/dev/text-parser` in the shared source and at `/` in the managed deployment copy. Browser checks verified whole-block email-style text preservation, optional known author, three labelled messages, stale-output messaging and Clear. No commitment API requests were made. Permanent publication has not completed; the earlier publication card was cancelled/denied.
