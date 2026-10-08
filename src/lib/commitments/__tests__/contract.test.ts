import { after, before, describe, it } from "node:test";
import { expect } from "./expect";
import { commitmentContract } from "../hooks";
import { POST } from "../../../app/api/follow-up/route";
import { createDemoCommitments } from "../__fixtures__/demo";

const alex = createDemoCommitments(new Date(2026, 9, 8, 12))[2]; // "Send the API key"

describe("commitmentContract (useCommitments() functions)", () => {
  it("never throws: failures return null (here: mutation attempted outside the browser)", () => {
    expect(commitmentContract.updateCommitment("missing", { status: "completed" })).toBeNull();
    expect(commitmentContract.dismissCommitment("missing")).toBeNull();
    expect(commitmentContract.addCommitments([alex])).toBeNull();
    expect(commitmentContract.getCommitment("missing")).toBeUndefined();
    expect(commitmentContract.getMessage("missing")).toBeUndefined();
  });
});

describe("POST /api/follow-up (README contract)", () => {
  const saved = { key: process.env.OPENAI_API_KEY };
  before(() => {
    delete process.env.OPENAI_API_KEY; // never call a real provider from unit tests
  });
  after(() => {
    if (saved.key !== undefined) process.env.OPENAI_API_KEY = saved.key;
  });

  const post = (body: unknown) =>
    POST(
      new Request("http://test/api/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: typeof body === "string" ? body : JSON.stringify(body),
      }),
    );

  it("400 with { error } for invalid JSON or an invalid commitment", async () => {
    const bad = await post("{not json");
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({ error: "Body must be valid JSON" });

    const invalid = await post({ commitment: { id: "x" } });
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error).toMatch(/Invalid commitment/);
  });

  it("503 with { error } — not a fake draft — when AI is not configured", async () => {
    const res = await post({ commitment: alex, tone: "casual" });
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toMatch(/aren't configured/);
    expect(data.message).toBeUndefined();
  });

  it("200 { message, source: 'template' } only when allowTemplate is sent", async () => {
    const res = await post({ commitment: alex, tone: "polite", allowTemplate: true });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const data = await res.json();
    expect(data.source).toBe("template");
    expect(data.message).toContain("Hi Alex");
    expect(data.notice).toMatch(/not AI/);
  });

  it("413 for oversized bodies", async () => {
    const res = await post({ commitment: { ...alex, evidenceQuote: "x".repeat(20_000) } });
    expect(res.status).toBe(413);
  });
});
