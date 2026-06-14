import { afterEach, describe, expect, it, vi } from "vitest";

// verifyAuth is cookie-only (rejects the agent token); verifyAgentAuth accepts
// token OR cookie and is wired to /api/v1/browser/* only. We stub require-session
// to a fixed `false` so the token branch is observable through verifyAgentAuth.
// The token is read from OS_AGENT_TOKEN at module load → resetModules + dynamic
// import per case. lib/host is stubbed so audit() never touches disk.
vi.mock("@/lib/auth/require-session", () => ({
  requireSession: vi.fn(async () => false),
  getSessionActor: vi.fn(async () => null),
}));
vi.mock("@/lib/host", () => ({
  audit: vi.fn(),
}));

const VALID = "a".repeat(16); // exactly the >=16 minimum
const VALID_LONG = "k".repeat(40);

async function load(token: string | undefined) {
  vi.resetModules();
  if (token === undefined) vi.stubEnv("OS_AGENT_TOKEN", "");
  else vi.stubEnv("OS_AGENT_TOKEN", token);
  return import("./server");
}

function reqWithToken(token: string | undefined): Request {
  const headers = new Headers();
  if (token !== undefined) headers.set("x-os-agent-token", token);
  return new Request("https://os.example/api/v1/x", { headers });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("verifyAuth — cookie-only (token always rejected)", () => {
  it("rejects a valid agent token (token must NOT unlock fs/exec/term)", async () => {
    const { verifyAuth } = await load(VALID_LONG);
    expect(await verifyAuth(reqWithToken(VALID_LONG))).toBe(false);
  });

  it("returns true when requireSession() is true (cookie path)", async () => {
    const reqMod = await import("@/lib/auth/require-session");
    (reqMod.requireSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const { verifyAuth } = await load(VALID_LONG);
    expect(await verifyAuth(reqWithToken(VALID_LONG))).toBe(true);
  });
});

describe("verifyAgentAuth (token branch) — disabled unless >=16 chars", () => {
  it("rejects when OS_AGENT_TOKEN is unset (empty)", async () => {
    const { verifyAgentAuth } = await load(undefined);
    expect(await verifyAgentAuth(reqWithToken(""))).toBe(false);
  });

  it("rejects when OS_AGENT_TOKEN is shorter than 16 chars, even on an exact match", async () => {
    const short = "a".repeat(15);
    const { verifyAgentAuth } = await load(short);
    // Same value presented → still false because the token is too weak to enable.
    expect(await verifyAgentAuth(reqWithToken(short))).toBe(false);
  });
});

describe("verifyAgentAuth (token branch) — enabled with a strong token", () => {
  it("returns true only on an exact match", async () => {
    const { verifyAgentAuth } = await load(VALID_LONG);
    expect(await verifyAgentAuth(reqWithToken(VALID_LONG))).toBe(true);
  });

  it("returns true for a 16-char token (boundary) on exact match", async () => {
    const { verifyAgentAuth } = await load(VALID);
    expect(await verifyAgentAuth(reqWithToken(VALID))).toBe(true);
  });

  it("returns false for a wrong token of the SAME length", async () => {
    const { verifyAgentAuth } = await load(VALID_LONG);
    const wrongSameLen = "k".repeat(39) + "x"; // 40 chars, one differs
    expect(wrongSameLen).toHaveLength(VALID_LONG.length);
    expect(await verifyAgentAuth(reqWithToken(wrongSameLen))).toBe(false);
  });

  it("returns false when no token header is present", async () => {
    const { verifyAgentAuth } = await load(VALID_LONG);
    expect(await verifyAgentAuth(reqWithToken(undefined))).toBe(false);
  });

  it("returns false when there is no request at all", async () => {
    const { verifyAgentAuth } = await load(VALID_LONG);
    expect(await verifyAgentAuth(undefined)).toBe(false);
  });
});

describe("verifyAgentAuth falls through to the session when the token fails", () => {
  it("returns true via requireSession when the agent token is wrong but a session exists", async () => {
    const reqMod = await import("@/lib/auth/require-session");
    (reqMod.requireSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const { verifyAgentAuth } = await load(VALID_LONG);
    expect(await verifyAgentAuth(reqWithToken("wrong-token-value-here"))).toBe(true);
  });
});

describe("callerActor — audit attribution", () => {
  it("returns agent:<8-char fingerprint> when a valid token is presented", async () => {
    const { callerActor } = await load(VALID_LONG);
    const actor = await callerActor(reqWithToken(VALID_LONG));
    expect(actor).toMatch(/^agent:[0-9a-f]{8}$/);
  });

  it("returns the same fingerprint across calls (deterministic per-token)", async () => {
    const { callerActor } = await load(VALID_LONG);
    const a = await callerActor(reqWithToken(VALID_LONG));
    const b = await callerActor(reqWithToken(VALID_LONG));
    expect(a).toBe(b);
  });

  it("falls back to getSessionActor() when the token is absent/invalid", async () => {
    const reqMod = await import("@/lib/auth/require-session");
    (reqMod.getSessionActor as ReturnType<typeof vi.fn>).mockResolvedValueOnce("dev-123");
    const { callerActor } = await load(VALID_LONG);
    expect(await callerActor(reqWithToken("wrong"))).toBe("dev-123");
  });
});
