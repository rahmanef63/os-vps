// Pre-deploy smoke test — vitest, not Playwright. Hits the most critical
// HTTP surface of a running production server to catch the classes of bugs
// the CLAUDE.md deploy notes call out: stale chunk MIME, version pipeline,
// auth gate, basic API liveness.
//
// HOW TO RUN
//   pnpm vitest run scripts/e2e/smoke.test.ts
// requires:
//   E2E_BASE_URL=http://localhost:4005   (or wherever the prod build serves)
//
// `describe.skipIf` makes this a no-op in `pnpm test` unless E2E_BASE_URL is
// set. The CI hook (scripts/ci.sh) opts in post-deploy.

import { describe, expect, it } from "vitest";

const BASE = process.env.E2E_BASE_URL ?? "";
const skip = !BASE;

async function get(path: string, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5_000);
  try {
    return await fetch(`${BASE}${path}`, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// The describe label is the skip reason the user sees in the vitest report when
// E2E_BASE_URL is unset — it tells them WHY the suite is skipped + how to opt
// in, instead of a silent "(skipped)" with no breadcrumb.
describe.skipIf(skip)(
  skip
    ? "[smoke] SKIPPED — set E2E_BASE_URL=http://host:port to enable live deploy probe"
    : `[smoke] live deploy probe @ ${BASE}`,
  () => {
  it.skipIf(skip)("GET /api/auth/me returns 200 or 401 — never crashes", async () => {
    const res = await get("/api/auth/me");
    expect([200, 401]).toContain(res.status);
    // Body should be JSON-parseable regardless of auth state.
    const text = await res.text();
    expect(() => JSON.parse(text)).not.toThrow();
  });

  it.skipIf(skip)("GET /api/version returns JSON with buildId", async () => {
    const res = await get("/api/version");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { buildId?: unknown };
    expect(typeof body.buildId).toBe("string");
    expect((body.buildId as string).length).toBeGreaterThan(0);
  });

  it.skipIf(skip)("GET /api/v1/sys/cpu without auth returns 401 (gate working)", async () => {
    const res = await get("/api/v1/sys/cpu");
    // Auth gate is healthy when an unauthenticated probe returns 401.
    // Accept 403 too in case the gate evolves to "forbidden".
    expect([401, 403]).toContain(res.status);
  });

  it.skipIf(skip)("a referenced _next/static chunk serves with correct MIME", async () => {
    // Discover a real chunk URL from the rendered shell so we don't hardcode
    // a hash. The home page is HTML and always references >=1 _next/static
    // chunk. Catches the classic stale-CDN chunk 404 / wrong MIME bug.
    const homeRes = await get("/");
    expect(homeRes.status).toBe(200);
    const html = await homeRes.text();
    const m = html.match(/\/_next\/static\/[^"' )]+\.(?:js|css)/);
    expect(m, "no _next/static chunk found in home HTML").not.toBeNull();
    const chunkPath = m![0];
    const res = await get(chunkPath);
    expect(res.status).toBe(200);
    const ct = res.headers.get("content-type") ?? "";
    const expected = chunkPath.endsWith(".css")
      ? "text/css"
      : "javascript";
    expect(ct.toLowerCase()).toContain(expected);
  });
  },
);
