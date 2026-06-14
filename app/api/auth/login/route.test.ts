import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { clientIp } from "./route";

// clientIp() is the rate-limit key. Behind multi-hop proxies (Cloudflare →
// nginx → app), the LAST x-forwarded-for entry is the internal nginx — taking
// it would collapse every external client into a single bucket. The function
// honours OS_TRUSTED_PROXY_HOPS to pick the right hop.

function reqWith(headers: Record<string, string>): NextRequest {
  return {
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("clientIp — XFF trusted-proxy hops", () => {
  it("1 hop (default) → last XFF entry", () => {
    expect(
      clientIp(reqWith({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3" })),
    ).toBe("3.3.3.3");
  });

  it("OS_TRUSTED_PROXY_HOPS=2 → second from last", () => {
    vi.stubEnv("OS_TRUSTED_PROXY_HOPS", "2");
    expect(
      clientIp(reqWith({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3" })),
    ).toBe("2.2.2.2");
  });

  it("OS_TRUSTED_PROXY_HOPS=3 → third from last", () => {
    vi.stubEnv("OS_TRUSTED_PROXY_HOPS", "3");
    expect(
      clientIp(reqWith({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3" })),
    ).toBe("1.1.1.1");
  });

  it("hops exceed chain length → clamps to leftmost", () => {
    vi.stubEnv("OS_TRUSTED_PROXY_HOPS", "9");
    expect(clientIp(reqWith({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }))).toBe(
      "1.1.1.1",
    );
  });

  it("invalid env value falls back to 1", () => {
    vi.stubEnv("OS_TRUSTED_PROXY_HOPS", "not-a-number");
    expect(
      clientIp(reqWith({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" })),
    ).toBe("2.2.2.2");
  });

  it("no XFF → falls back to x-real-ip then loopback", () => {
    expect(clientIp(reqWith({ "x-real-ip": "5.5.5.5" }))).toBe("5.5.5.5");
    expect(clientIp(reqWith({}))).toBe("127.0.0.1");
  });

  it("ignores empty XFF entries from trailing commas", () => {
    expect(clientIp(reqWith({ "x-forwarded-for": "1.1.1.1,," }))).toBe(
      "1.1.1.1",
    );
  });
});
