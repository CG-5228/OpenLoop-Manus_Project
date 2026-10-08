/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS Node test entry point. */
const assert = require("node:assert/strict");
const path = require("node:path");
const { createRequire } = require("node:module");
const { test } = require("node:test");
/* eslint-enable @typescript-eslint/no-require-imports */

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

test("the empty importer can prerender without calling crypto.randomUUID", () => {
  const original = crypto.randomUUID;
  crypto.randomUUID = () => { throw new Error("Do not generate random IDs during prerender"); };
  try {
    assert.doesNotThrow(() => renderToStaticMarkup(React.createElement(ConversationImporter, { onImport: () => {} })));
  } finally {
    crypto.randomUUID = original;
  }
});

test("the importer accepts parser-only action copy without claiming an AI request", () => {
  const html = renderToStaticMarkup(React.createElement(ConversationImporter, {
    onImport: () => {}, submitLabel: "Preview parsed JSON", inputDisclosure: "Parser-only: no AI request.",
  }));
  assert.match(html, /Preview parsed JSON/);
  assert.match(html, /Parser-only: no AI request/);
  assert.doesNotMatch(html, /Send messages for analysis/);
});

test("the playground declares parser-only behaviour and leaves submission empty on first render", () => {
  const { ConversationImportPlayground } = load("./src/components/import/ConversationImportPlayground.js");
  const html = renderToStaticMarkup(React.createElement(ConversationImportPlayground));
  assert.match(html, /Parser-only test/);
  assert.match(html, /does not detect promises, run AI, save conversations/);
  assert.match(html, /Preview parsed JSON/);
  assert.doesNotMatch(html, /data-testid="parsed-output"/);
});

test("whole-block input preserves email headers, Unicode and whitespace without guessing speakers", () => {
  const { parseTextInput } = load("./src/lib/conversation/parseTextInput.js");
  const text = "  Subject: Budget\r\nFrom: James\r\n\r\nI'll send €20 tomorrow.  ";
  const messages = parseTextInput({ text, mode: "whole-block" });
  assert.equal(messages.length, 1);
  assert.equal(messages[0].text, text);
  assert.equal(messages[0].sender, "Unknown sender");
  assert.equal(messages[0].sentAt, null);
  assert.equal(messages[0].source, "paste");
});

test("whole-block input supports only an explicitly supplied author and enforces text limits", () => {
  const { parseTextInput } = load("./src/lib/conversation/parseTextInput.js");
  assert.equal(parseTextInput({ text: "A plain paragraph", mode: "whole-block", knownAuthor: " James " })[0].sender, "James");
  assert.deepEqual(parseTextInput({ text: " \n ", mode: "whole-block" }), []);
  assert.throws(() => parseTextInput({ text: "x".repeat(MAX_CONVERSATION_CHARACTERS + 1), mode: "whole-block" }), hasCode("text_too_long"));
});

test("labelled mode reuses the existing parser and preserves small talk and uncertainty", () => {
  const { parseTextInput } = load("./src/lib/conversation/parseTextInput.js");
  const messages = parseTextInput({ text: "James: Hi!\nMe: I'll send the report.\nSarah: I might review it.", mode: "labelled-chat" });
  assert.deepEqual(messages.map(m => m.sender), ["James", "Me", "Sarah"]);
  assert.equal(messages[0].text, "Hi!");
  assert.equal(messages[2].text, "I might review it.");
  assert.ok(messages.every(m => m.sentAt === null));
});

test("quick parser renders whole-block input, optional author and honest output boundaries without random IDs on mount", () => {
  const { QuickTextParser } = load("./src/components/import/QuickTextParser.js");
  const original = crypto.randomUUID;
  crypto.randomUUID = () => { throw new Error("No random IDs on mount"); };
  try {
    const html = renderToStaticMarkup(React.createElement(QuickTextParser));
    assert.match(html, /Enter text\. Inspect the output/);
    assert.match(html, /Known author \(optional\)/);
    assert.match(html, /Whole block/);
    assert.match(html, /not meaningful-promise extraction/);
    assert.match(html, /Parse text/);
    assert.doesNotMatch(html, /quick-parsed-output/);
  } finally {
    crypto.randomUUID = original;
  }
});

test("live commitment test discloses provider processing and never analyses on initial render", () => {
  const { CommitmentTestPlayground } = load("./src/components/import/CommitmentTestPlayground.js");
  const html = renderToStaticMarkup(React.createElement(CommitmentTestPlayground));
  assert.match(html, /Real AI processing/);
  assert.match(html, /configured AI provider/);
  assert.match(html, /Find commitments/);
  assert.match(html, /does not save conversations/);
  assert.doesNotMatch(html, /data-testid="commitment-output"/);
});

test("client commitment response guard rejects malformed outputs", () => {
  const { isCommitmentPreview } = load("./src/lib/conversation/requestCommitments.js");
  assert.equal(isCommitmentPreview(null), false);
  assert.equal(isCommitmentPreview({ title: "Fake" }), false);
  assert.equal(isCommitmentPreview({ id: "c", title: "Send report", promisor: "James", beneficiary: "Me", direction: "they_owe", dueAt: null, evidenceQuote: "I'll send you the report", sourceMessageId: "m", confidence: "high", status: "pending" }), true);
});

test("email lists import JSON and separated text blocks with stable metadata and Unicode", () => {
  const { parseEmailList, SAMPLE_EMAIL_LIST, EMAIL_BLOCK_EXAMPLE } = load("./src/lib/conversation/emailList.js");
  assert.deepEqual(parseEmailList(JSON.stringify(SAMPLE_EMAIL_LIST)), SAMPLE_EMAIL_LIST);
  const blocks = parseEmailList(EMAIL_BLOCK_EXAMPLE.replace(/\n/g, "\r\n"));
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].from, "James");
  assert.equal(blocks[0].sentAt, "2026-10-08T10:00:00Z");
  assert.equal(blocks[1].sentAt, null);
  assert.equal(parseEmailList('[{"from":"Éva","to":"Me; Sarah","body":"I’ll send €20 🙂"}]')[0].body, "I’ll send €20 🙂");
});

test("email import rejects malformed lists, duplicate IDs, invalid dates and size overflow", () => {
  const { parseEmailList, validateEmailList, MAX_EMAIL_LIST_BYTES, MAX_EMAILS } = load("./src/lib/conversation/emailList.js");
  for (const text of ["", "[broken", "No From header", "From: James\nSubject: Empty\n\n"]) assert.throws(() => parseEmailList(text));
  const valid = { id: "one", from: "James", body: "Hello" };
  assert.throws(() => validateEmailList([valid, valid]), /Duplicate/);
  assert.throws(() => validateEmailList(Array.from({ length: MAX_EMAILS + 1 }, (_, i) => ({ ...valid, id: `${i}` }))), /at most 100/);
  assert.throws(() => validateEmailList([{ ...valid, sentAt: "2026-02-30T10:00:00Z" }]), /invalid date/);
  assert.throws(() => validateEmailList([{ ...valid, sentAt: "2026-10-08T25:00:00Z" }]), /invalid date/);
  assert.throws(() => validateEmailList([{ ...valid, sentAt: "2026-10-08" }]), /known timezone/);
  assert.throws(() => validateEmailList([{ ...valid, body: "x".repeat(100_001) }]), /100000/);
  assert.throws(() => parseEmailList("x".repeat(MAX_EMAIL_LIST_BYTES + 1)), /1 MiB/);
});

test("email search, sender and inclusive date filters compose without inferring unknown dates", () => {
  const { filterEmailList, SAMPLE_EMAIL_LIST } = load("./src/lib/conversation/emailList.js");
  assert.deepEqual(filterEmailList(SAMPLE_EMAIL_LIST, { query: "REVISED" }).map(e => e.id), ["report"]);
  assert.deepEqual(filterEmailList(SAMPLE_EMAIL_LIST, { sender: "Me", query: "Sarah" }).map(e => e.id), ["slides"]);
  assert.equal(filterEmailList(SAMPLE_EMAIL_LIST, { fromDate: "2026-10-08", toDate: "2026-10-08" }).length, 3);
  assert.equal(filterEmailList(SAMPLE_EMAIL_LIST, { fromDate: "2026-10-09" }).length, 0);
});

test("manual email scope excludes hidden and unchecked emails even if selected overall", () => {
  const { selectedVisibleEmails, SAMPLE_EMAIL_LIST } = load("./src/lib/conversation/emailList.js");
  const selected = new Set(["report", "newsletter", "slides"]);
  assert.deepEqual(selectedVisibleEmails(SAMPLE_EMAIL_LIST, { sender: "James" }, selected).map(e => e.id), ["report"]);
  assert.deepEqual(selectedVisibleEmails(SAMPLE_EMAIL_LIST, {}, new Set()).map(e => e.id), []);
});

test("email conversion and relevance mapping keep exact source IDs/evidence", () => {
  const { emailToMessage, emailIdsWithCommitments, SAMPLE_EMAIL_LIST } = load("./src/lib/conversation/emailList.js");
  const message = emailToMessage(SAMPLE_EMAIL_LIST[0]);
  assert.equal(message.id, "report");
  assert.equal(message.sender, "James");
  assert.match(message.text, /Subject: Report for review\nTo: Me/);
  assert.ok(message.text.includes(SAMPLE_EMAIL_LIST[0].body));
  assert.deepEqual([...emailIdsWithCommitments(SAMPLE_EMAIL_LIST, [{ sourceMessageId: "report", evidenceQuote: "I'll email you the revised report tomorrow." }])], ["report"]);
  assert.throws(() => emailIdsWithCommitments(SAMPLE_EMAIL_LIST, [{ sourceMessageId: "missing", evidenceQuote: "Hello" }]), /traced/);
  assert.throws(() => emailIdsWithCommitments(SAMPLE_EMAIL_LIST, [{ sourceMessageId: "report", evidenceQuote: "Invented quote" }]), /traced/);
});

test("email analysis sends one independent source per call with at most two active calls", async () => {
  const { analyseEmailList } = load("./src/lib/conversation/analyseEmailList.js");
  const { SAMPLE_EMAIL_LIST } = load("./src/lib/conversation/emailList.js");
  let active = 0, peak = 0;
  const seen = [], progress = [];
  const result = await analyseEmailList(SAMPLE_EMAIL_LIST, { currentUserLabel: " Me ", onProgress: n => progress.push(n) }, async payload => {
    active++; peak = Math.max(peak, active); seen.push(payload);
    await new Promise(resolve => setTimeout(resolve, 5));
    active--; return [];
  });
  assert.equal(peak, 2);
  assert.equal(seen.length, 4);
  assert.ok(seen.every(p => p.messages.length === 1 && p.currentUserLabel === "Me"));
  assert.ok(result.every(r => r.error === null && r.commitments.length === 0));
  assert.deepEqual(progress, [1, 2, 3, 4]);
});

test("email analysis preserves per-email failures and never turns invalid evidence into an irrelevant verdict", async () => {
  const { analyseEmailList } = load("./src/lib/conversation/analyseEmailList.js");
  const { SAMPLE_EMAIL_LIST } = load("./src/lib/conversation/emailList.js");
  const result = await analyseEmailList(SAMPLE_EMAIL_LIST.slice(0, 2), { currentUserLabel: "Me" }, async payload => {
    if (payload.messages[0].id === "report") throw new Error("Provider unavailable");
    return [{ sourceMessageId: "report", evidenceQuote: "Wrong source" }];
  });
  assert.equal(result[0].error, "Provider unavailable");
  assert.match(result[1].error, /traced/);
});

test("email analysis checks bounds/identity and cancellation before sending text", async () => {
  const { analyseEmailList } = load("./src/lib/conversation/analyseEmailList.js");
  const { SAMPLE_EMAIL_LIST } = load("./src/lib/conversation/emailList.js");
  let calls = 0;
  const request = async () => { calls++; return []; };
  await assert.rejects(analyseEmailList([], { currentUserLabel: "Me" }, request), /at least one/);
  await assert.rejects(analyseEmailList(Array(11).fill(SAMPLE_EMAIL_LIST[0]), { currentUserLabel: "Me" }, request), /up to 10/);
  await assert.rejects(analyseEmailList(SAMPLE_EMAIL_LIST, { currentUserLabel: "" }, request), /own name/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(analyseEmailList(SAMPLE_EMAIL_LIST, { currentUserLabel: "Me", signal: controller.signal }, request));
  assert.equal(calls, 0);
});

test("email selection UI discloses AI scope and does not load or analyse an inbox on render", () => {
  const { EmailSelectionPlayground } = load("./src/components/import/EmailSelectionPlayground.js");
  const html = renderToStaticMarkup(React.createElement(EmailSelectionPlayground));
  assert.match(html, /AI-select sends all currently visible emails/);
  assert.match(html, /No Gmail connection/);
  assert.match(html, /Try sample email list/);
  assert.doesNotMatch(html, /data-testid="email-analysis-output"/);
  assert.doesNotMatch(html, /data-testid="email-report"/);
});

test("email analysis never treats an empty error as a no-commitments result", async () => {
  const { analyseEmailList } = load("./src/lib/conversation/analyseEmailList.js");
  const { SAMPLE_EMAIL_LIST } = load("./src/lib/conversation/emailList.js");
  const result = await analyseEmailList(SAMPLE_EMAIL_LIST.slice(0, 1), { currentUserLabel: "Me" }, async () => { throw new Error("  "); });
  assert.ok(result[0].error.trim().length > 0);
});

test("email relevance independently rejects blank evidence quotes", () => {
  const { emailIdsWithCommitments, SAMPLE_EMAIL_LIST } = load("./src/lib/conversation/emailList.js");
  assert.throws(() => emailIdsWithCommitments(SAMPLE_EMAIL_LIST, [{ sourceMessageId: "report", evidenceQuote: "" }]), /traced/);
});

test("client guard rejects a commitment with empty evidence", () => {
  const { isCommitmentPreview } = load("./src/lib/conversation/requestCommitments.js");
  assert.equal(isCommitmentPreview({ id: "c", title: "Send report", promisor: "James", beneficiary: "Me", direction: "they_owe", dueAt: null, evidenceQuote: "", sourceMessageId: "m", confidence: "high", status: "pending" }), false);
});
