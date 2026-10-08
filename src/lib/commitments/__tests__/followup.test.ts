import { describe, it, mock } from "node:test";
import { expect } from "./expect";
import { sanitizeFollowUp, templateFollowUp, validateFollowUpRequest } from "../followup";
import {
  FollowUpUnavailableError,
  generateFollowUp,
  getAiConfig,
  type AiConfig,
} from "../followup.server";
import { requestFollowUp } from "../followup-client";
import { createDemoCommitments } from "../__fixtures__/demo";

const NOW = new Date(2026, 9, 8, 12, 0, 0);
const demo = createDemoCommitments(NOW);
const alex = demo.find((c) => c.id === "demo-3")!; // they owe, no deadline
const james = demo.find((c) => c.id === "demo-2")!; // they owe, overdue
const sarahSlides = demo.find((c) => c.id === "demo-1")!; // you owe

const config: AiConfig = { apiKey: "test-key", baseUrl: "https://ai.example/v1", model: "gpt-5-mini", timeoutMs: 5000 };

function mockFetch(handler: (url: string, init: RequestInit) => { status?: number; body: unknown }) {
  return mock.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const { status = 200, body } = handler(String(url), init ?? {});
    return new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch & ReturnType<typeof mock.fn>;
}

describe("validateFollowUpRequest", () => {
  it("accepts a valid request with defaults", () => {
    const r = validateFollowUpRequest({ commitment: alex });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.tone).toBe("casual");
      expect(r.value.allowTemplate).toBe(false);
    }
  });

  it("accepts the contract tones and lenient aliases", () => {
    for (const tone of ["casual", "polite", "firm"]) {
      const r = validateFollowUpRequest({ commitment: alex, tone });
      expect(r.ok && r.value.tone).toBe(tone);
    }
    const alias = validateFollowUpRequest({ commitment: alex, tone: "friendly" });
    expect(alias.ok && alias.value.tone).toBe("casual");
  });

  it("rejects bad input", () => {
    expect(validateFollowUpRequest(null).ok).toBe(false);
    expect(validateFollowUpRequest({ commitment: { id: "x" } }).ok).toBe(false);
    expect(validateFollowUpRequest({ commitment: alex, tone: "angry" }).ok).toBe(false);
    expect(validateFollowUpRequest({ commitment: alex, now: "not a date" }).ok).toBe(false);
    expect(validateFollowUpRequest({ commitment: alex, allowTemplate: "yes" }).ok).toBe(false);
  });
});

describe("templateFollowUp (labelled non-AI draft, opt-in only)", () => {
  it("nudges the promisor and quotes the original message (brief example)", () => {
    const msg = templateFollowUp(alex, { now: NOW });
    expect(msg).toContain("Hey Alex");
    expect(msg).toContain(`"I'll send you the API key."`);
    expect(msg).not.toMatch(/overdue|late/i);
  });

  it("acknowledges overdue items gently", () => {
    expect(templateFollowUp(james, { now: NOW })).toMatch(/Any update/);
    expect(templateFollowUp(james, { now: NOW, tone: "firm" })).toMatch(/overdue/);
  });

  it("writes an update to the beneficiary when the user owes", () => {
    const msg = templateFollowUp(sarahSlides, { now: NOW });
    expect(msg).toContain("Sarah");
    expect(msg).toMatch(/haven't forgotten/);
  });
});

describe("sanitizeFollowUp", () => {
  it("extracts JSON and strips wrapping quotes", () => {
    expect(sanitizeFollowUp('{"message":"\\"Hey Alex, any news?\\""}')).toBe("Hey Alex, any news?");
    expect(sanitizeFollowUp("  Hey Alex!  ")).toBe("Hey Alex!");
  });

  it("rejects empty, placeholder or oversized output", () => {
    expect(sanitizeFollowUp("")).toBeNull();
    expect(sanitizeFollowUp(null)).toBeNull();
    expect(sanitizeFollowUp("Hi [Name], any update?")).toBeNull();
    expect(sanitizeFollowUp("x".repeat(700))).toBeNull();
  });
});

describe("getAiConfig", () => {
  it("reads env without exposing defaults as secrets", () => {
    expect(getAiConfig({}).apiKey).toBeNull();
    expect(getAiConfig({}).baseUrl).toBe("https://api.openai.com/v1");
    expect(getAiConfig({}).model).toBe("gpt-5-mini");
    const c = getAiConfig({ OPENAI_API_KEY: " k ", OPENAI_API_BASE: "https://p/v1/", OPENAI_MODEL: "m" });
    expect(c).toMatchObject({ apiKey: "k", baseUrl: "https://p/v1", model: "m" });
    expect(getAiConfig({ OPENAI_MODEL: "a", OPENAI_FOLLOWUP_MODEL: "b" }).model).toBe("b");
  });
});

describe("generateFollowUp", () => {
  const input = { commitment: alex, tone: "casual" as const, currentUserLabel: "Me", now: NOW };

  it("rejects with 503 (no made-up success) when no API key is configured", async () => {
    const fetchImpl = mockFetch(() => ({ body: {} }));
    await expect(generateFollowUp(input, { ...config, apiKey: null }, fetchImpl)).rejects.toThrow(
      FollowUpUnavailableError,
    );
    try {
      await generateFollowUp(input, { ...config, apiKey: null }, fetchImpl);
    } catch (err) {
      expect((err as FollowUpUnavailableError).status).toBe(503);
      expect((err as FollowUpUnavailableError).code).toBe("not_configured");
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns a labelled template only when the client opts in", async () => {
    const fetchImpl = mockFetch(() => ({ body: {} }));
    const res = await generateFollowUp({ ...input, allowTemplate: true }, { ...config, apiKey: null }, fetchImpl);
    expect(res.source).toBe("template");
    expect(res.model).toBeNull();
    expect(res.notice).toMatch(/not AI/);
    expect(res.message).toContain("Hey Alex");
  });

  it("calls the provider with the commitment facts and returns the AI draft", async () => {
    let sent: Record<string, unknown> = {};
    const fetchImpl = mockFetch((url, init) => {
      expect(url).toBe("https://ai.example/v1/chat/completions");
      expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
      sent = JSON.parse(String(init.body));
      return {
        body: { choices: [{ message: { content: '{"message":"Hey Alex, just checking in on that API key whenever you get a chance. Thanks!"}' } }] },
      };
    });
    const res = await generateFollowUp(input, config, fetchImpl);
    expect(res).toEqual({
      message: "Hey Alex, just checking in on that API key whenever you get a chance. Thanks!",
      source: "ai",
      model: "gpt-5-mini",
    });
    const userMsg = (sent.messages as { content: string }[])[1].content;
    expect(userMsg).toContain("I'll send you the API key.");
    expect(userMsg).toContain('"recipientName": "Alex"');
    expect(sent.reasoning_effort).toBe("minimal");
    expect(sent.response_format).toBeTruthy();
  });

  it("retries once in compatibility mode on HTTP 400", async () => {
    let calls = 0;
    const fetchImpl = mockFetch((_u, init) => {
      calls++;
      const body = JSON.parse(String(init.body));
      if (body.response_format) return { status: 400, body: { error: "unsupported" } };
      return { body: { choices: [{ message: { content: "Hey Alex, any update on the API key?" } }] } };
    });
    const res = await generateFollowUp(input, config, fetchImpl);
    expect(calls).toBe(2);
    expect(res.source).toBe("ai");
  });

  it("rejects with 502 on provider failure or unusable output", async () => {
    const down = mockFetch(() => ({ status: 500, body: "boom" }));
    await expect(generateFollowUp(input, config, down)).rejects.toThrow(/couldn't draft/);

    const junk = mockFetch(() => ({ body: { choices: [{ message: { content: "Hi [Name]!" } }] } }));
    try {
      await generateFollowUp(input, config, junk);
      throw new Error("should have rejected");
    } catch (err) {
      expect(err).toMatchObject({ status: 502, code: "unusable_output" });
    }
  });

  it("uses a labelled template on provider failure only with allowTemplate", async () => {
    const down = mockFetch(() => ({ status: 500, body: "boom" }));
    const res = await generateFollowUp({ ...input, allowTemplate: true }, config, down);
    expect(res.source).toBe("template");
    expect(res.notice).toMatch(/template draft, not AI/);
  });
});

describe("requestFollowUp (client)", () => {
  it("posts the commitment and returns the parsed response", async () => {
    const fetchImpl = mockFetch((url, init) => {
      expect(url).toBe("/api/follow-up");
      const sent = JSON.parse(String(init.body));
      expect(sent.commitment.id).toBe("demo-3");
      expect(sent.allowTemplate).toBeUndefined();
      return { body: { message: "Hey Alex!", source: "ai", model: "gpt-5-mini" } };
    });
    const res = await requestFollowUp(alex, { fetchImpl });
    expect(res.message).toBe("Hey Alex!");
  });

  it("surfaces server validation errors", async () => {
    const fetchImpl = mockFetch(() => ({ status: 400, body: { error: "Invalid commitment: missing id" } }));
    await expect(requestFollowUp(alex, { fetchImpl })).rejects.toThrow("Invalid commitment: missing id");
  });

  it("surfaces AI-unavailable errors and only sends allowTemplate when asked", async () => {
    const unavailable = mockFetch(() => ({ status: 503, body: { error: "AI follow-ups aren't configured on this server." } }));
    await expect(requestFollowUp(alex, { fetchImpl: unavailable })).rejects.toThrow(/aren't configured/);

    const fetchImpl = mockFetch((_url, init) => {
      expect(JSON.parse(String(init.body)).allowTemplate).toBe(true);
      return { body: { message: "Hey Alex!", source: "template", model: null, notice: "Template" } };
    });
    const res = await requestFollowUp(alex, { fetchImpl, allowTemplate: true });
    expect(res.source).toBe("template");
    expect(res.notice).toBe("Template");
  });
});
