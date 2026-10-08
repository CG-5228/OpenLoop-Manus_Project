# Member 2 outcomes

## Module implementation and foundation compatibility

- [x] Work on `feature/conversation`, preserving team-owned types/modules and shared main.
- [x] Provide `ConversationImporter({ onImport })` for paste/sample, editable content, structured preview, multiple speakers, user identity and optional explicit reference date.
- [x] Provide `.txt` validation and UTF-8 reading with unsupported/empty/binary/size/encoding errors.
- [x] Emit canonical `Message[]` preserving sender, text, IDs, source and known timestamps without inventing ambiguous dates.
- [x] Provide an honest OCR adapter boundary; screenshots remain disabled without real OCR.
- [x] Document exports, source boundaries and Member 3's extraction handoff.
- [x] Integrate Member 5's shared starter/types without redefining them; pass 34 module tests and shared lint/TypeScript/production-build checks.

## Parser-only test interfaces

- [x] `/dev/conversation`: actual importer and structured JSON; sample/paste/.txt flows, no AI submission.
- [x] `/dev/text-parser`: whole-block or explicitly labelled chat input, Parse text, optional author, readable output/JSON and stale-result warning without current-user gating.
- [x] Synthetic browser checks: whole-block email-style text preservation, explicit author, labelled messages, sample/file import, stale output, Clear and known timestamp offsets.

## Live AI test harness

- [x] Reuse Member 3's newly pushed endpoint unchanged in a detached integration worktree, without merging into main or rewriting the AI service.
- [x] Provide text input, explicit identity, optional known author/reference date, Find commitments, loading/errors, evidence-backed output and JSON.
- [x] Disclose actual server/model processing; no persistence, Gmail connection or automatic messaging.
- [x] Verify the actual shared sample through the real provider: four commitments, two in each direction, exact evidence and tentative statement excluded.
- [x] Verify a novel whole-email promise and a no-promises input using real inference.

Current live test is a temporary sandbox production server. The managed website is still parser-only and permanent publication did not complete: its earlier publication card was cancelled/denied. PR #1 remains a draft.

## Remaining product integration

- [ ] Member 1 mounts the importer and aligns it with the real dashboard.
- [ ] Connect the product host callback to Member 3's endpoint and validate deployment-side provider access; the isolated test does not replace this gate.
- [ ] Members 1/4/5 connect commitments to browser persistence/actions and verify the complete product flow, including phone layout.
- [ ] Member 5 coordinates review/merge and verifies the publicly deployed end-to-end app.
- [ ] Connect and test real OCR after the P0 text-to-AI flow is working. PDF and richer chat-format parsing remain optional.
