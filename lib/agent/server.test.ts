import { afterEach, describe, expect, it, vi } from "vitest";

// verifyAuth is cookie-only. requireSession is stubbed so both branches are
// observable without a real session store.
vi.mock("@/lib/auth/require-session", () => ({
  requireSession: vi.fn(async () => false),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("verifyAuth — cookie-only session gate", () => {
  it("returns false without a session", async () => {
    const { verifyAuth } = await import("./server");
    expect(await verifyAuth(new Request("https://os.example/api/v1/x"))).toBe(false);
  });

  it("returns true when requireSession() is true", async () => {
    const reqMod = await import("@/lib/auth/require-session");
    (reqMod.requireSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const { verifyAuth } = await import("./server");
    expect(await verifyAuth(new Request("https://os.example/api/v1/x"))).toBe(true);
  });

  it("works with no request argument (call-site symmetry)", async () => {
    const { verifyAuth } = await import("./server");
    expect(await verifyAuth()).toBe(false);
  });

  it("always rejects host API auth in demo builds", async () => {
    vi.stubEnv("NEXT_PUBLIC_OS_DEMO", "1");
    const reqMod = await import("@/lib/auth/require-session");
    (reqMod.requireSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const { verifyAuth } = await import("./server");
    expect(await verifyAuth(new Request("https://os.example/api/v1/sys/stats"))).toBe(false);
  });
});
