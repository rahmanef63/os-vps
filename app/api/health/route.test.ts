// Liveness probe contract: 200 + required shape + no-store. The endpoint
// is unauthenticated by design — external monitors need to hit it without
// session credentials.
import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("/api/health", () => {
  it("returns 200 with status/buildId/uptime/version", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe("ok");
    expect(typeof body.buildId).toBe("string");
    expect(typeof body.uptime).toBe("number");
    expect((body.uptime as number) >= 0).toBe(true);
    expect(typeof body.version).toBe("string");
    expect((body.version as string).length).toBeGreaterThan(0);
  });

  it("sets Cache-Control: no-store", async () => {
    const res = await GET();
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
