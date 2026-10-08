const assert = require("node:assert/strict");
const path = require("node:path");
const { createRequire } = require("node:module");
const { test } = require("node:test");

// Compile the module first. No temporary contract or dependencies belong in the app repo.
const buildRoot = process.env.CONVERSATION_BUILD_DIR;
if (!buildRoot) throw new Error("Set CONVERSATION_BUILD_DIR to the compiled output root (see docs/conversation/README.md).");
const load = createRequire(path.join(buildRoot, "package.json"));
const { parseConversation, MAX_CONVERSATION_CHARACTERS } = load("./src/lib/conversation/parseConversation.js");
const { readTextFile } = load("./src/lib/conversation/readTextFile.js");
const { readScreenshot } = load("./src/lib/conversation/ocr.js");
const { validateImportFile, MAX_IMPORT_FILE_BYTES } = load("./src/lib/conversation/validateFile.js");
const { SAMPLE_CONVERSATION, SAMPLE_CURRENT_USER, SAMPLE_REFERENCE_DATE } = load("./src/lib/conversation/fixtures.js");
const React = load("react");
const { renderToStaticMarkup } = load("react-dom/server");
const { ConversationImporter } = load("./src/components/import/ConversationImporter.js");
const { MessagePreview } = load("./src/components/import/MessagePreview.js");

const parse = (text, options = {}) => parseConversation({ text, source: "paste", conversationId: "test-conversation", ...options });
const metadata = (name, type, size = 100) => ({ name, type, size });
const hasCode = (code) => (error) => error.code === code;

test("the fictional sample preserves all speakers, including tentative statements", () => {
  const messages = parse(SAMPLE_CONVERSATION);
  assert.equal(messages.length, 5);
  assert.deepEqual(messages.map((message) => message.sender), ["Me", "James", "Me", "Alex", "Sarah"]);
  assert.equal(messages[4].text, "I might review your CV sometime.");
  assert.equal(messages[2].text, "I'll transfer Sam €20 on Friday.");
  assert.ok(messages.every((message) => message.conversationId === "test-conversation" && message.source === "paste"));
  assert.equal(new Set(messages.map((message) => message.id)).size, 5);
});

test("known offsets normalize timestamps to ISO UTC", () => {
  assert.equal(parse("2026-10-08 17:00+01:00 | James: The report is ready.")[0].sentAt, "2026-10-08T16:00:00.000Z");
  assert.equal(parse("2026-10-08T17:00:42Z | Me: Hello.")[0].sentAt, "2026-10-08T17:00:42.000Z");
});

test("an explicit host offset resolves unzoned timestamps", () => {
  assert.equal(parse(SAMPLE_CONVERSATION, { timestampOffset: "+01:00" })[0].sentAt, "2026-10-08T16:00:00.000Z");
});

test("missing and timezone-ambiguous timestamps remain null", () => {
  assert.equal(parse("James: Tomorrow sounds good.")[0].sentAt, null);
  assert.equal(parse(SAMPLE_CONVERSATION)[0].sentAt, null);
});

test("invalid calendar dates and out-of-range times are not invented", () => {
  for (const value of ["2026-02-30T17:00Z", "2026-10-08T25:00Z", "2026-10-08T17:61Z"]) {
    assert.equal(parse(`${value} | James: Hello.`)[0].sentAt, null);
  }
});

test("invalid host offsets are reported clearly", () => {
  assert.throws(() => parse("Me: Hello.", { timestampOffset: "+99:00" }), hasCode("invalid_offset"));
});

test("multiline text and paragraph breaks stay with the previous speaker", () => {
  const messages = parse("James: First line\nSecond line\n\nThird line\nMe: Thanks.");
  assert.equal(messages.length, 2);
  assert.equal(messages[0].text, "First line\nSecond line\n\nThird line");
});

test("CRLF, emoji and Unicode text are preserved", () => {
  const messages = parse("Éva: I'll send €20 🙂\r\nMe: Thanks!");
  assert.equal(messages[0].sender, "Éva");
  assert.equal(messages[0].text, "I'll send €20 🙂");
  assert.equal(messages.length, 2);
});

test("unlabelled content uses an explicit unknown or caller-provided sender", () => {
  assert.equal(parse("An unlabelled message")[0].sender, "Unknown sender");
  assert.equal(parse("An unlabelled message", { fallbackSender: "Imported participant" })[0].sender, "Imported participant");
});

test("standalone URLs are not treated as speaker labels", () => {
  const messages = parse("https://example.com/report\nmailto:demo@example.com");
  assert.equal(messages[0].sender, "Unknown sender");
  assert.equal(messages[0].text, "https://example.com/report\nmailto:demo@example.com");
});

test("empty content produces no messages and oversized input is rejected", () => {
  assert.deepEqual(parse(" \n\n "), []);
  assert.deepEqual(parse("James: "), []);
  assert.throws(() => parse("x".repeat(MAX_CONVERSATION_CHARACTERS + 1)), hasCode("text_too_long"));
});

test("source and canonical Message fields are preserved for every input method", () => {
  for (const source of ["paste", "txt", "image"]) {
    const message = parse("Me: Hello.", { source })[0];
    assert.equal(message.source, source);
    assert.deepEqual(Object.keys(message).sort(), ["conversationId", "id", "sender", "sentAt", "source", "text"]);
  }
});

test("supported file extensions and MIME types are accepted", () => {
  assert.equal(validateImportFile(metadata("chat.TXT", "text/plain")), "text");
  assert.equal(validateImportFile(metadata("chat.txt", "")), "text");
  assert.equal(validateImportFile(metadata("chat.png", "image/png")), "image");
  assert.equal(validateImportFile(metadata("chat.jpeg", "image/jpeg")), "image");
  assert.equal(validateImportFile(metadata("chat.webp", "image/webp")), "image");
});

test("unsupported extensions and inconsistent MIME types are rejected", () => {
  for (const file of [metadata("chat.pdf", "application/pdf"), metadata("chat.exe", "text/plain"), metadata("chat.png", "text/plain")]) {
    assert.throws(() => validateImportFile(file), hasCode("unsupported_file"));
  }
});

test("empty and oversized files are rejected", () => {
  assert.throws(() => validateImportFile(metadata("chat.txt", "text/plain", 0)), hasCode("empty_file"));
  assert.throws(() => validateImportFile(metadata("chat.txt", "text/plain", MAX_IMPORT_FILE_BYTES + 1)), hasCode("file_too_large"));
});

test("UTF-8 files, including BOM and non-ASCII content, can be read", async () => {
  const file = new File(["\uFEFFMe: I'll send €20."], "chat.txt", { type: "text/plain" });
  assert.equal(await readTextFile(file), "Me: I'll send €20.");
});

test("invalid UTF-8 and binary files return explicit errors", async () => {
  await assert.rejects(readTextFile(new File([new Uint8Array([0xff])], "chat.txt")), hasCode("invalid_text"));
  await assert.rejects(readTextFile(new File(["Me: hello\0"], "chat.txt")), hasCode("invalid_text"));
});

test("whitespace-only files and files exceeding the character limit are rejected", async () => {
  await assert.rejects(readTextFile(new File([" \n "], "chat.txt")), hasCode("empty_file"));
  await assert.rejects(readTextFile(new File(["x".repeat(MAX_CONVERSATION_CHARACTERS + 1)], "chat.txt")), hasCode("text_too_long"));
});

test("screenshots cannot silently produce fake OCR when the adapter is absent", async () => {
  await assert.rejects(readScreenshot(new File(["synthetic"], "chat.png", { type: "image/png" })), hasCode("ocr_unavailable"));
});

test("an injected OCR adapter returns editable text and forwards progress", async () => {
  const file = new File(["synthetic"], "chat.png", { type: "image/png" });
  let progress;
  const text = await readScreenshot(file, async (receivedFile, onProgress) => {
    assert.equal(receivedFile, file);
    onProgress({ fraction: 1, label: "Complete" });
    return "James: Read this before analysis.";
  }, (value) => { progress = value; });
  assert.equal(text, "James: Read this before analysis.");
  assert.deepEqual(progress, { fraction: 1, label: "Complete" });
});

test("empty OCR output is rejected rather than sent to analysis", async () => {
  await assert.rejects(readScreenshot(new File(["synthetic"], "chat.png"), async () => "  "), hasCode("invalid_text"));
});

test("import component renders labels, optional date context and honest OCR availability", () => {
  const html = renderToStaticMarkup(React.createElement(ConversationImporter, { onImport: () => { throw new Error("Must not submit during render"); } }));
  assert.match(html, /Try sample conversation/);
  assert.match(html, /Which sender is you/);
  assert.match(html, /Conversation date \(optional\)/);
  assert.match(html, /Screenshot OCR is not connected yet/);
  assert.match(html, /type="submit" disabled/);
  assert.match(html, /role="status"/);
});

test("message previews escape message HTML instead of executing it", () => {
  const html = renderToStaticMarkup(React.createElement(MessagePreview, { messages: parse("Me: <script>alert(1)</script>") }));
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test("files without extensions and prototype-name extensions are rejected", () => {
  for (const name of ["txt", "png", "chat.__proto__", "chat.constructor", "chat.toString"]) {
    assert.throws(() => validateImportFile(metadata(name, "")), hasCode("unsupported_file"));
  }
});

test("the sample carries only the date and identity explicitly stated in the shared brief", () => {
  assert.equal(SAMPLE_REFERENCE_DATE, "2026-10-08");
  assert.equal(SAMPLE_CURRENT_USER, "Me");
});
