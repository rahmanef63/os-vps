import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-session", () => ({
  requireSession: vi.fn(async () => true),
}));

describe("/api/status", () => {
  it("requires an owner session", async () => {
    const auth = await import("@/lib/auth/require-session");
    vi.mocked(auth.requireSession).mockResolvedValueOnce(false);
    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/status") as never);
    expect(res.status).toBe(401);
  });

  it("returns security posture without secrets", async () => {
    const { GET } = await import("./route");
    const res = await GET(new Request("https://mso.example/api/status", {
      headers: { "x-forwarded-proto": "https", "x-forwarded-host": "mso.example" },
    }) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.linuxUser).toBe("string");
    expect(Array.isArray(body.readRoots)).toBe(true);
    expect(Array.isArray(body.writeRoots)).toBe(true);
    expect(body.currentAccess).toBe("Reverse proxy");
    expect(JSON.stringify(body)).not.toContain("OS_SESSION_SECRET");
  });
});
