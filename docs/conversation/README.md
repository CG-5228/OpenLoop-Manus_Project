# Member 2 — Conversation processing module

**Branch:** `feature/conversation`

**Status:** Text-import module scaffold verified against the shared application foundation; not yet mounted or verified end-to-end/deployed.

## Ownership and file structure

```text
src/components/import/
  ConversationImporter.tsx
  ConversationTextInput.tsx
  ConversationFileUpload.tsx
  ConversationDateInput.tsx
  MessagePreview.tsx
  SenderSelector.tsx
  useConversationImport.ts
  index.ts
src/lib/conversation/
  types.ts
  parseConversation.ts
  validateFile.ts
  readTextFile.ts
  ocr.ts
  fixtures.ts
  index.ts
tests/conversation/
  check-scaffold.py
  conversation.test.cjs
docs/conversation/
  plan.md
  TODO.md
  README.md
```

The module imports `Message` from **`src/types/openloop.ts`**, which Member 5 owns. The actual shared starter and types are now on `main` and incorporated into this feature branch. Member 2 does not author competing types, app-wide configuration, routes or a dashboard; it uses the coordinator's React/Tailwind application dependencies.

## Host-facing interface

The entry point is **`ConversationImporter({ onImport })`**, following the newly added `PROJECT_BRIEF.md`. The callback receives **`{ messages, currentUserLabel, referenceDate? }`**. Member 1 mounts the importer in a client component; the host callback connects to Member 3's extraction flow and Member 4's storage. Sample and custom conversations use the same callback, with no hardcoded commitment results.

```tsx
"use client";

import { ConversationImporter } from "../../components/import";
import type { ConversationImportPayload } from "../../lib/conversation";

type ImportPanelProps = {
  onImport: (payload: ConversationImportPayload) => Promise<void>;
};

export function ImportPanel({ onImport }: ImportPanelProps) {
  return <ConversationImporter onImport={onImport} />;
}
```

Import paths depend on the host file's location. The host callback should await the analysis request so loading and endpoint errors reach the UI; connect it to `POST /api/commitments/extract`, whose request body accepts this payload. This module does not implement that endpoint.

| Public interface | Purpose |
| --- | --- |
| `ConversationImporter` | Editable text, optional file input, preview, fictional sample, sender/date identification, status/errors and host submission. |
| `onImport(payload)` | Hands structured messages and identity/context to the host; never extracts commitments inside this module. |
| `timestampOffset?: string` | Explicit known offset such as `+01:00` or `Z`; never guessed from the browser. |
| `extractImageText?: ExtractImageText` | Optional real OCR adapter; screenshots remain unavailable when omitted. |
| `parseConversation(input): Message[]` | Format parsing independent of React and AI. |
| `readTextFile(file): Promise<string>` | Validates and reads a local UTF-8 `.txt` file. |
| `readScreenshot(file, adapter): Promise<string>` | Validates the image and delegates to a real adapter. No OCR engine is bundled. |

The interface does not send files to a server, save conversations, auto-send follow-ups or call AI on mount. Submitting invokes the host callback. An OCR adapter may contact an external provider; the integrator must disclose any such transfer and protect credentials.

## Parsing and date conventions

Baseline formats are `Sender: message` and `2026-10-08 17:00 | Sender: message`. Explicit timestamp zones such as `2026-10-08T17:00Z | Sender: message` are supported. Multiline content and paragraph breaks continue the previous message. Text without a sender receives `Unknown sender` unless the caller supplies an explicit `fallbackSender`.

A timestamp lacking a timezone remains `null` unless the caller supplies a known `timestampOffset`. Missing or invalid timestamps are never invented. The user can supply optional **conversation date context** as `referenceDate`; this does not populate a message timestamp or create a deadline. The fictional sample supplies the date explicitly stated in the shared brief: `2026-10-08`. New file imports reset that date rather than silently reusing sample context.

The parser does not interpret “tomorrow”, detect promises or reject tentative statements; those tasks belong to Member 3. This is format parsing, not chat-provider recognition. WhatsApp date formats, locale-specific timestamps, quoted sender-like lines and PDF parsing are not implemented. A line shaped like `Name: text` is treated as a speaker header even when its meaning is ambiguous; users must correct the editable input before analysis.

## Upload and OCR boundaries

Text files must be UTF-8 and use `.txt`; empty, whitespace-only, invalidly encoded and NUL-containing files are rejected. Uploads are limited to **5 MiB**, and conversation text to **100,000 characters**. PNG, JPEG and WebP require a real OCR adapter to produce editable text. Extension/MIME checks are preliminary validation, not proof that an image is valid; the adapter must validate decoding and enforce processing limits. PDF, GIF and other formats are unsupported.

OCR output replaces the editable input, retains source `image`, and must be reviewed before submission. No fabricated screenshot results are used.

## Shared-contract dependency

The current `PROJECT_BRIEF.md`, README and actual shared source file specify source `"paste" | "txt" | "image"` and path `src/types/openloop.ts`. The older `BRIEF.md` uses `"text"` and lists `"pdf"`. This branch follows the **newer canonical contract** and derives source types from the shared `Message`. The foundation gate is now cleared: module tests and the shared lint/typecheck/production-build checks passed using canonical types. The importer still needs to be mounted and connected to live AI.

## Repeatable scaffold check

`tests/conversation/check-scaffold.py` requires Python 3, Node.js 22+ and React, React DOM, their typings and TypeScript. It compiles only Member 2's source in a temporary workspace and runs `conversation.test.cjs`. If canonical shared types are absent, it uses a **verbatim temporary copy** of the shared contract from `PROJECT_BRIEF.md` (falling back to README), outside this repository. It never commits substitute shared types.

Once the shared starter's dependencies are installed:

```bash
python3 tests/conversation/check-scaffold.py
```

Before the starter exists, create validation-only dependencies **outside the repository**:

```bash
REPO="$PWD"
TOOLS="$(mktemp -d)"
cd "$TOOLS"
npm init -y
npm pkg set packageManager=npm@10.9.2
npm install --save-exact --no-audit --no-fund \
  react@19.2.0 react-dom@19.2.0 \
  @types/react@19.2.0 @types/react-dom@19.2.0 typescript@5.9.3
cd "$REPO"
python3 tests/conversation/check-scaffold.py --toolchain-dir "$TOOLS"
```

These are **validation-only** dependency versions, not changes to the eventual app manifest. The test file can also run against equivalent compiled CommonJS output via `CONVERSATION_BUILD_DIR`; the compiled root must contain `src/lib/conversation/*.js` and `src/components/import/*.js`, and resolve React/React DOM.

Tests cover pure parsing, timestamp handling, upload validation, UTF-8 reading, missing-OCR errors, a synthetic injected OCR adapter and server-rendered component smoke checks. Synthetic OCR tests do not establish real OCR quality. Static rendering does not establish browser interaction, end-to-end AI integration or a full Next.js build. Run the shared application's actual build and live import journey after integration.

## Current handoffs

See [Member 2 progress](./MEMBER_2_PROGRESS.md) for verified status and remaining work, and [Member 3 extraction handoff](./MEMBER_3_HANDOFF.md) for the exact payload, shared types, synthetic request and AI endpoint requirements.

## Interactive parser playground

Open `/dev/conversation` on the feature branch's running Next.js app. Click **Try sample conversation**, then **Preview parsed JSON** to inspect the actual `Message[]`, current-user label and optional date. For custom input, use `Me: message` / `James: message`, choose the matching current-user label and preview again. A fictional upload file is available at `tests/conversation/sample-conversation.txt`.

This test page uses the real importer but only displays a payload in browser memory. **It does not call AI, detect commitments, store messages or send message input to a server.** Screenshot OCR remains unavailable. The optional known-offset selector is explicit; it does not infer the timezone.

Browser checks verified five-message sample submission, two-message custom paste, `.txt` import with Unicode/source preserved, unsupported-PDF rejection and explicit timestamp-offset conversion. The initial mount check exposed `crypto.randomUUID()` in the hook's server prerender; ID initialization was deferred to user input, with a failing-then-passing regression test. Product button/disclosure defaults are unchanged; the playground overrides only their visible copy.

Temporary preview for this task: https://3000-irmxsi7nd463jgidio6kb-2835a6f1.us4.manus.computer/dev/conversation . This is sandbox access, not the team's deployed product URL. Run locally using `npm run dev` and visit `http://localhost:3000/dev/conversation`.

## Quick text entry and output

`/dev/text-parser` mounts `QuickTextParser`. Enter any text, choose **Whole block** or **Labelled chat**, then click **Parse text**. No current-user selection is required. Whole-block mode preserves the entire text exactly, including email headers and paragraphs, as one canonical message; it uses an optional explicitly supplied author or `Unknown sender`. Labelled-chat mode reuses `parseConversation`, preserving all context rather than filtering small talk or uncertainty. Output includes readable messages, canonical `Message[]` JSON, a Copy JSON action and a stale-output notice after edits. Empty input is disabled; the 100,000-character bound remains enforced.

This is **format-only**. It does not infer meaningful commitments, resolve relative deadlines, connect to Gmail or replace Member 3's extraction endpoint. It does not call AI or persist input. The existing `/dev/conversation` importer and host callback are unchanged. Module tests now cover whole-block preservation and initial quick-parser rendering, in addition to the existing parser/upload/OCR-boundary checks.

## Live AI text-to-commitment test

`/dev/commitment-test` provides `CommitmentTestPlayground`: paste a labelled conversation or a whole email/body block, explicitly identify yourself, optionally supply the block's known author and conversation date, then click **Find commitments**. It uses Member 3's `POST /api/commitments/extract` endpoint through the browser-side `requestCommitments` adapter; no AI implementation is duplicated in Member 2's branch. The UI displays loading/errors, empty results, direction, promisor/beneficiary, due date, confidence, exact evidence, source-message ID and returned JSON. Edits flag the output as stale. Clear/cancel removes browser-held results.

Unlike the parser-only views, **this deliberate AI action transmits input to the test server and configured model provider**. The page visibly discloses this. It does not save conversations, connect to Gmail or send messages. Use fictional input; whole-block mode does not reconstruct email threads or infer authors.

The current temporary integration server combines the Member 2 UI with unchanged Member 3 endpoint code in a detached worktree at `/home/ubuntu/openloop-ai-test`, based on AI-branch commit `0b49b36`. No shared-main merge or edits to Member 3's service were performed. The server uses the already configured sandbox credential only server-side. This does **not** establish permanent published AI access or guarantee future provider availability.

Verified with actual model calls through the production test runtime: the shared sample returned four commitments (two `you_owe`, two `they_owe`) with exact evidence and the tentative statement excluded; a novel whole email from James returned one `they_owe` report promise due `2026-10-09` from reference date `2026-10-08`; small talk/tentative plans returned `{ commitments: [] }`. All 34 Member 2 module tests and both source/integration lint, TypeScript and production builds passed.

Temporary live test: https://3001-irmxsi7nd463jgidio6kb-2835a6f1.us4.manus.computer/dev/commitment-test . The managed static homepage remains parser-only and is not a permanently published live-AI service.
