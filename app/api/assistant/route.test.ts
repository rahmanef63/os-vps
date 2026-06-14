// Unit tests for the assistant SSE route. We don't exercise the upstream
// Anthropic stream — only the auth + rate-limit guard at the top of POST.
// Goal: prove the 31st request inside the 60s window returns 429 with a
// Retry-After header, while the 30 before it pass the guard.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mocked BEFORE the route is imported. Each test resets the modules so the
// per-process rate-limit bucket starts clean (otherwise tests leak state via
// the singleton Map in lib/host/rate-limit).
const stableSession = { device_id: "test-device" };

vi.mock("@/lib/auth/require-session", () => ({
  getSession: vi.fn(async () => stableSession),
}));

// Stub config: a valid key short-circuits the early 501 path so we hit the
// real upstream SDK ctor, which we then prevent from streaming by aborting
// the request signal before the route reaches the stream loop.
vi.mock("@/lib/config/store", () => ({
  resolveApiKey: vi.fn(async () => "sk-test-key"),
  resolveModel: vi.fn(async () => "claude-test"),
}));

// The Anthropic SDK is constructed inside POST. We don't actually want it to
// run — but the rate-limit gate fires BEFORE the SDK is touched, so passing
// requests will reach `new Anthropic({...})`. Stub it to a noop instance.
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class FakeAnthropic {
      messages = {
        stream: () => {
          // Return an object with the minimum shape the route awaits: an
          // async iterator that yields nothing + a finalMessage() resolver.
          return Object.assign(
            (async function* () {
              /* no events */
            })(),
            { finalMessage: async () => ({ content: [], stop_reason: "end_turn" }), abort: () => {} },
          );
        },
      };
    },
  };
});

function makeReq(): Request {
  // AbortController so the stream cancels cleanly and we don't leak timers.
  const ac = new AbortController();
  const req = new Request("http://localhost/api/assistant", {
    method: "POST",
    body: JSON.stringify({ messages: [{ role: "user", text: "hi" }] }),
    headers: { "content-type": "application/json" },
    signal: ac.signal,
  });
  return req;
}

describe("/api/assistant rate limit", () => {
  beforeEach(() => {
    // Reset the singleton rate-limit Map between tests by re-importing the
    // module fresh. vi.resetModules() clears the cache so the next dynamic
    // import gets a new buckets Map.
    vi.resetModules();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 429 with Retry-After once burst is exceeded inside the window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const { POST } = await import("./route");
    // 30 allowed inside the 60s window.
    for (let i = 0; i < 30; i++) {
      const res = await POST(makeReq());
      // Either 200 (stream) or some non-429 — we just assert NOT limited.
      expect(res.status).not.toBe(429);
    }
    const limited = await POST(makeReq());
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("60");
    const body = await limited.json();
    expect(body.error).toBe("rate_limited");
  });

  it("does not rate-limit when the session is missing — returns 401 instead", async () => {
    const mod = await import("@/lib/auth/require-session");
    vi.mocked(mod.getSession).mockResolvedValueOnce(null);
    const { POST } = await import("./route");
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });
});
