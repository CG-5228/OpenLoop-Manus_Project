import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { candidate, message, sampleRequest } from "./fixtures.mjs";

const require = createRequire(import.meta.url);
const load = (file) => require(resolve(process.env.OPENLOOP_COMPILED_ROOT, "src/lib/ai", `${file}.js`));
const { validateExtractionRequest, LIMITS } = load("request");
const { validateModelOutput, commitmentContentKey } = load("output");
const { supportedDeadline, isIsoDate, isIsoDateTime } = load("dates");
const { handleExtractionRequest } = load("http");
const { callExtractionModel, readProviderConfig } = load("provider");
const { EXTRACTION_SCHEMA, buildModelMessages } = load("prompt");
const { ExtractionError } = load("errors");
const valid = () => validateExtractionRequest(sampleRequest);
const body = (overrides = {}) => ({ ...structuredClone(sampleRequest), ...overrides });
const httpRequest = (payload = sampleRequest, headers = {}) => new Request("https://openloop.test/api/commitments/extract", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(payload) });
const output = (item = candidate(), request = valid()) => validateModelOutput({ commitments: [item] }, request);
const providerConfig = { apiKey: "synthetic-test-key", baseUrl: "https://provider.test/v1", model: "gpt-5-mini", timeoutMs: 1000 };
const completion = (value, overrides = {}) => Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(value) }, ...overrides }] });

// These tests mock the model transport. Live-inference checks are a separate script.
test("canonical sample request and txt/image source are accepted", () => {
  assert.deepEqual(valid(), sampleRequest);
  assert.equal(validateExtractionRequest(body({ messages: [message("Me", "I'll send it.", "txt", { source: "txt" })] })).messages[0].source, "txt");
  assert.equal(validateExtractionRequest(body({ messages: [message("Me", "I'll send it.", "img", { source: "image" })] })).messages[0].source, "image");
});

for (const [name, value] of [
  ["null input", null], ["empty messages", body({ messages: [] })], ["missing identity", body({ currentUserLabel: "" })],
  ["unknown identity", body({ currentUserLabel: "Unknown sender" })], ["invalid reference date", body({ referenceDate: "2026-02-30" })],
  ["date-time reference instead of date", body({ referenceDate: "2026-10-08T00:00:00Z" })],
  ["duplicate IDs", body({ messages: [message("Me", "A"), message("James", "B")] })],
  ["old text source enum", body({ messages: [message("Me", "A", "m1", { source: "text" })] })],
  ["unzoned timestamp", body({ messages: [message("Me", "A", "m1", { sentAt: "2026-10-08T17:00:00" })] })],
  ["rollover timestamp", body({ messages: [message("Me", "A", "m1", { sentAt: "2026-02-30T17:00:00Z" })] })],
  ["missing timestamp field", body({ messages: [{ id: "a", conversationId: "b", sender: "Me", text: "A", source: "paste" }] })],
  ["missing text", body({ messages: [message("Me", "   ")] })],
]) test(`rejects ${name}`, () => assert.throws(() => validateExtractionRequest(value), (error) => error.status === 400));

test("message count and aggregate text have visible 413 limits", () => {
  assert.throws(() => validateExtractionRequest(body({ messages: Array.from({ length: 501 }, (_, i) => message("Me", "A", String(i))) })), (error) => error.status === 413);
  assert.throws(() => validateExtractionRequest(body({ messages: [message("Me", "a".repeat(60_000), "a"), message("Me", "b".repeat(60_000), "b")] })), (error) => error.status === 413);
  assert.throws(() => validateExtractionRequest(body({ messages: [message("Me", "a".repeat(100_001))] })), (error) => error.status === 413);
  assert.equal(validateExtractionRequest(body({ messages: [message("Me", "a".repeat(100_000))] })).messages[0].text.length, 100_000);
});

test("ISO validation rejects impossible dates, invalid times and offsets", () => {
  assert.equal(isIsoDate("2024-02-29"), true);
  for (const date of ["2026-02-29", "2026-13-01", "2026-1-01"]) assert.equal(isIsoDate(date), false);
  for (const date of ["2026-10-08T24:00:00Z", "2026-10-08T17:60:00Z", "2026-10-08T17:00:00+15:00", "2026-10-08T17:00:00+14:01"]) assert.equal(isIsoDateTime(date), false);
  assert.equal(isIsoDateTime("2026-10-08T17:00:00.123+01:00"), true);
});

test("server supplies promisor, direction, pending status and a content ID", () => {
  const [item] = output();
  assert.equal(item.promisor, "James");
  assert.equal(item.direction, "they_owe");
  assert.equal(item.beneficiary, "Me");
  assert.equal(item.status, "pending");
  assert.equal(item.dueAt, "2026-10-09");
  assert.match(item.id, /^ol_[a-f0-9]{32}$/);
  assert.deepEqual(Object.keys(item).sort(), ["id", "title", "promisor", "beneficiary", "direction", "dueAt", "evidenceQuote", "sourceMessageId", "confidence", "status"].sort());
});

test("you owe and unrelated third party are distinguished using identity", () => {
  const [item] = output(candidate({ sourceMessageId: "sample-message-1", evidenceQuote: sampleRequest.messages[0].text, beneficiary: "Sarah", title: "Send the slides", dueAt: "2026-10-08", deadlineQuote: "tonight" }));
  assert.equal(item.direction, "you_owe");
  const thirdPartyRequest = validateExtractionRequest({ messages: [message("James", "I'll send Sarah the notes.")], currentUserLabel: "Me" });
  const [thirdParty] = output(candidate({ sourceMessageId: "m1", evidenceQuote: thirdPartyRequest.messages[0].text, beneficiary: "Sarah", dueAt: null, deadlineQuote: null }), thirdPartyRequest);
  assert.equal(thirdParty.direction, "unknown");
  assert.equal(output(candidate({ beneficiary: null }))[0].direction, "unknown");
});

test("unknown sender does not become a known promisor or high-confidence user debt", () => {
  const request = validateExtractionRequest({ messages: [message("Unknown sender", "I'll email you the report tomorrow.")], currentUserLabel: "Me" });
  const [item] = output(candidate({ sourceMessageId: "m1", beneficiary: null }), request);
  assert.equal(item.promisor, "Unknown sender");
  assert.equal(item.direction, "unknown");
  assert.equal(item.confidence, "low");
  assert.equal(item.dueAt, null);
});

test("current-user spoofing and incidental substring recipients are rejected", () => {
  const request = validateExtractionRequest({ messages: [message("James", "I'll send Sarah the annual notes.")], currentUserLabel: "Me" });
  const base = candidate({ sourceMessageId: "m1", evidenceQuote: request.messages[0].text, dueAt: null, deadlineQuote: null });
  assert.throws(() => output({ ...base, beneficiary: "Me" }, request), (error) => error.code === "INVALID_MODEL_OUTPUT");
  assert.throws(() => output({ ...base, beneficiary: "Ann" }, request), (error) => error.code === "INVALID_MODEL_OUTPUT");
  const incidental = validateExtractionRequest({ messages: [message("Me", "Sarah is on holiday.", "context"), message("James", "I'll send the report.")], currentUserLabel: "Me" });
  assert.throws(() => output(candidate({ sourceMessageId: "m1", evidenceQuote: "I'll send the report.", beneficiary: "Sarah", dueAt: null, deadlineQuote: null }), incidental), /unsupported results/);
  const mentioned = validateExtractionRequest({ messages: [message("James", "I'll send Sarah the notes you requested.")], currentUserLabel: "Me" });
  assert.throws(() => output(candidate({ sourceMessageId: "m1", evidenceQuote: mentioned.messages[0].text, beneficiary: "Me", dueAt: null, deadlineQuote: null }), mentioned), /unsupported results/);
});

test("accepted immediately preceding direct requests can identify the requester", () => {
  const request = validateExtractionRequest({ messages: [message("Me", "Could you send me the notes?", "ask"), message("James", "Yes, I'll send the notes.")], currentUserLabel: "Me" });
  const [item] = output(candidate({ sourceMessageId: "m1", evidenceQuote: "Yes, I'll send the notes.", beneficiary: "Me", dueAt: null, deadlineQuote: null }), request);
  assert.equal(item.direction, "they_owe");
});

for (const [name, item] of [
  ["invented quote", candidate({ evidenceQuote: "I promise to do something different" })],
  ["invalid source ID", candidate({ sourceMessageId: "missing" })],
  ["invalid confidence", candidate({ confidence: "certain" })],
  ["invalid date", candidate({ dueAt: "2026-02-30" })],
  ["invented deadline quote", candidate({ deadlineQuote: "next Monday" })],
  ["invented beneficiary", candidate({ beneficiary: "Imaginary Stranger" })],
  ["empty title", candidate({ title: "" })],
  ["empty quote", candidate({ evidenceQuote: "" })],
  ["extra shared-status field", candidate({ status: "completed" })],
]) test(`rejects model ${name}`, () => assert.throws(() => output(item), (error) => error.code === "INVALID_MODEL_OUTPUT"));

test("missing candidate fields and excess output fail honestly", () => {
  const item = candidate(); delete item.beneficiary;
  assert.throws(() => output(item), /unsupported results/);
  assert.throws(() => validateModelOutput({ commitments: Array.from({ length: 101 }, () => candidate()) }, valid()), (error) => error.code === "OUTPUT_TOO_LARGE");
  assert.throws(() => validateModelOutput({ commitments: [], fake: true }, valid()), /unsupported results/);
});

test("no invented deadlines and common relative dates use explicit context", () => {
  const due = (quote, anchor, sentAt = null, proposed = "2099-01-01") => supportedDeadline(proposed, quote, `I'll send it ${quote}.`, sentAt, anchor);
  assert.equal(due("tomorrow", undefined), null);
  assert.equal(due("tomorrow", "2026-10-08"), "2026-10-09");
  assert.equal(due("Friday", "2026-10-08"), "2026-10-09");
  assert.equal(due("tonight", "2026-10-08"), "2026-10-08");
  assert.equal(due("tomorrow", "2026-10-08", "2026-12-31T20:00:00Z"), "2027-01-01");
  assert.equal(due("day after tomorrow", "2026-12-31"), "2027-01-02");
  assert.equal(due("in 3 days", "2026-10-08"), "2026-10-11");
  assert.equal(due("next Friday", "2026-10-08"), null);
  assert.equal(due("next week", "2026-10-08"), null);
  assert.equal(due("sometime", "2026-10-08"), null);
  assert.equal(supportedDeadline("2026-10-09", null, "I'll send it.", null, "2026-10-08"), null);
});

test("calendar dates retain date-only precision unless explicit zoned time is quoted", () => {
  assert.equal(supportedDeadline("2026-10-12T20:00:00Z", "October 12", "I'll send it October 12.", null, "2026-10-08"), "2026-10-12");
  assert.equal(supportedDeadline("2026-10-12", "October 12", "October 12", null), null);
  assert.equal(supportedDeadline("2027-10-12", "October 12 2027", "October 12 2027", null), "2027-10-12");
  assert.equal(supportedDeadline("2026-10-12", "October 13", "October 13", null, "2026-10-08"), null);
  assert.equal(supportedDeadline("2026-10-12T20:00:00Z", "2026-10-12", "2026-10-12", null), "2026-10-12");
  assert.equal(supportedDeadline("2026-10-12T20:00:00+01:00", "2026-10-12T20:00:00+01:00", "2026-10-12T20:00:00+01:00", null), "2026-10-12T20:00:00+01:00");
});

test("content keys survive regenerated import IDs but keep separate actions", () => {
  const [item] = output();
  const secondRequest = valid(); secondRequest.messages[1].id = "new-id"; secondRequest.messages[1].conversationId = "new-import";
  const [repeat] = output(candidate({ sourceMessageId: "new-id" }), secondRequest);
  assert.equal(item.id, repeat.id);
  assert.equal(commitmentContentKey(item), commitmentContentKey({ ...item, evidenceQuote: "  I'll EMAIL you the report tomorrow.  " }));
  assert.equal(validateModelOutput({ commitments: [candidate(), candidate()] }, valid()).length, 1);
  assert.notEqual(commitmentContentKey(item), commitmentContentKey({ ...item, title: "Upload the report" }));
});

test("real HTTP handler returns exact success or a valid no-results response", async () => {
  const response = await handleExtractionRequest(httpRequest(), async () => ({ commitments: [candidate()] }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal((await response.json()).commitments[0].direction, "they_owe");
  const empty = await handleExtractionRequest(httpRequest(), async () => ({ commitments: [] }));
  assert.deepEqual(await empty.json(), { commitments: [] });
});

test("malformed JSON, unsupported media, declared and streamed sizes are rejected before inference", async () => {
  let calls = 0;
  const mock = async () => { calls += 1; return { commitments: [] }; };
  const invalidJson = new Request("https://openloop.test", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  const malformed = await handleExtractionRequest(invalidJson, mock);
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error.code, "INVALID_JSON");
  assert.equal((await handleExtractionRequest(httpRequest(sampleRequest, { "Content-Type": "text/plain" }), mock)).status, 415);
  assert.equal((await handleExtractionRequest(httpRequest(sampleRequest, { "Content-Length": String(LIMITS.bodyBytes + 1) }), mock)).status, 413);
  const large = new Request("https://openloop.test", { method: "POST", headers: { "Content-Type": "application/json" }, body: " ".repeat(LIMITS.bodyBytes + 1) });
  assert.equal((await handleExtractionRequest(large, mock)).status, 413);
  assert.equal(calls, 0);
});

test("model failures expose safe error messages, never fixtures or private errors", async () => {
  const failure = await handleExtractionRequest(httpRequest(), async () => { throw new ExtractionError("AI_PROVIDER_ERROR", "Please retry.", 502); });
  assert.equal(failure.status, 502);
  assert.deepEqual(await failure.json(), { error: { code: "AI_PROVIDER_ERROR", message: "Please retry." } });
  const secret = "synthetic-sensitive-detail";
  const unknown = await handleExtractionRequest(httpRequest(), async () => { throw new Error(secret); });
  assert.equal(unknown.status, 500);
  assert.equal((await unknown.text()).includes(secret), false);
  assert.equal((await handleExtractionRequest(httpRequest(), async () => ({ commitments: [candidate({ evidenceQuote: "fabricated" })] }))).status, 502);
});

test("process-local concurrency limit rejects excess work and releases slots", async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let starts = 0;
  const waiting = Array.from({ length: 4 }, () => handleExtractionRequest(httpRequest(), async () => { starts += 1; await gate; return { commitments: [] }; }));
  while (starts < 4) await new Promise((resolve) => setImmediate(resolve));
  const busy = await handleExtractionRequest(httpRequest(), async () => ({ commitments: [] }));
  assert.equal(busy.status, 503);
  assert.equal((await busy.json()).error.code, "AI_BUSY");
  release();
  assert.equal((await Promise.all(waiting)).every((response) => response.status === 200), true);
  assert.equal((await handleExtractionRequest(httpRequest(), async () => ({ commitments: [] }))).status, 200);
});

test("provider configuration is runtime-only and rejects missing keys or unsafe URLs", () => {
  assert.throws(() => readProviderConfig({}), (error) => error.code === "AI_NOT_CONFIGURED");
  assert.equal(readProviderConfig({ OPENAI_API_KEY: "synthetic" }).baseUrl, "https://api.openai.com/v1");
  assert.equal(readProviderConfig({ OPENAI_API_KEY: "synthetic", OPENAI_API_BASE: "https://provider.test/v1/" }).baseUrl, "https://provider.test/v1");
  assert.equal(readProviderConfig({ OPENAI_API_KEY: "synthetic", OPENAI_MODEL: "gpt-5-nano" }).model, "gpt-5-nano");
  for (const url of ["http://provider.test", "https://user:password@provider.test", "https://provider.test?key=x"]) assert.throws(() => readProviderConfig({ OPENAI_API_KEY: "synthetic", OPENAI_BASE_URL: url }), (error) => error.status === 503);
});

test("provider sends strict schema and actual request, with no shared credentials in prompt", async () => {
  let captured;
  const transport = async (url, options) => { captured = { url, options }; return completion({ commitments: [candidate()] }); };
  const data = await callExtractionModel(valid(), providerConfig, transport);
  assert.equal(data.commitments.length, 1);
  assert.equal(captured.url, "https://provider.test/v1/chat/completions");
  const sent = JSON.parse(captured.options.body);
  assert.equal(sent.response_format.json_schema.strict, true);
  assert.deepEqual(sent.response_format.json_schema.schema, EXTRACTION_SCHEMA);
  assert.deepEqual(JSON.parse(sent.messages[1].content), sampleRequest);
  assert.equal(sent.messages[0].content.includes(providerConfig.apiKey), false);
  assert.equal(captured.options.redirect, "error");
  assert.equal(buildModelMessages(valid())[0].role, "system");
});

for (const [status, expected] of [[401, "AI_PROVIDER_AUTH"], [403, "AI_PROVIDER_AUTH"], [429, "AI_RATE_LIMITED"], [500, "AI_PROVIDER_ERROR"]]) {
  test(`provider HTTP ${status} maps to safe ${expected}`, async () => {
    await assert.rejects(callExtractionModel(valid(), providerConfig, async () => new Response("synthetic raw provider secret", { status })), (error) => error.code === expected && !error.message.includes("secret"));
  });
}

test("provider rejects truncation, refusal, null or malformed content", async () => {
  for (const response of [completion({ commitments: [] }, { finish_reason: "length" }), completion({}, { message: { content: null } }), completion({}, { message: { content: "{}", refusal: "cannot" } }), completion({}, { message: { content: "not JSON" } }), Response.json({})]) {
    await assert.rejects(callExtractionModel(valid(), providerConfig, async () => response), (error) => error.code === "INVALID_MODEL_OUTPUT");
  }
});

test("provider timeout and network error are informative without raw details", async () => {
  const transport = async (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new Error("synthetic private error"))));
  await assert.rejects(callExtractionModel(valid(), { ...providerConfig, timeoutMs: 5 }, transport), (error) => error.code === "AI_TIMEOUT" && error.status === 504);
  await assert.rejects(callExtractionModel(valid(), providerConfig, async () => { throw new Error("synthetic raw details"); }), (error) => error.code === "AI_PROVIDER_ERROR" && !error.message.includes("raw"));
});

test("Next.js POST export delegates to the same handler and reports missing runtime credentials", async () => {
  const route = require(resolve(process.env.OPENLOOP_COMPILED_ROOT, "src/app/api/commitments/extract/route.js"));
  const key = process.env.OPENAI_API_KEY;
  try {
    delete process.env.OPENAI_API_KEY;
    const response = await route.POST(httpRequest());
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, "AI_NOT_CONFIGURED");
  } finally {
    if (key !== undefined) process.env.OPENAI_API_KEY = key;
  }
});
