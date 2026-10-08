# Member 2 — Conversation processing module

**Branch:** `feature/conversation`

**Status:** Module scaffold; not a standalone application or a verified deployed feature.

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

The module imports `Message` from **`src/types/openloop.ts`**, which Member 5 owns. This branch intentionally does not create the shared type file, root `package.json`, Next.js configuration, app routes or dashboard. React and Tailwind come from the shared starter when it is available.

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

The current `PROJECT_BRIEF.md` and README specify source `"paste" | "txt" | "image"` and path `src/types/openloop.ts`. The older `BRIEF.md` uses `"text"` and lists `"pdf"`. This branch follows the **newer shared brief** and derives source types from the shared `Message` type rather than defining another Message interface. Member 5 still needs to add the actual shared file and application starter before this module can participate in an application build.

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
