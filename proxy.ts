// Next 16 renamed middleware.ts → proxy.ts. Every /api route already verifies
// the signed session cookie via requireSession(); this layer adds the second
// CSRF factor: mutating /api requests must come from our own origin. The
// session cookie is SameSite=Strict, but that is a single point of failure —
// these endpoints are literal host shell, so the defense is depth-2 on purpose.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function blocked() {
  return NextResponse.json({ error: "cross_origin_blocked" }, { status: 403 });
}

export function proxy(request: NextRequest) {
  if (MUTATING.has(request.method) && request.nextUrl.pathname.startsWith("/api/")) {
    // Sec-Fetch-Site is a forbidden header — attacker JS cannot forge it, so
    // when present it is authoritative. "none" = user-initiated, "same-origin"
    // = ours; do NOT also compare Origin here (behind the reverse proxy the
    // internal host differs from the public one and would false-positive).
    const site = request.headers.get("sec-fetch-site");
    if (site) {
      if (site !== "same-origin" && site !== "none") return blocked();
      return NextResponse.next();
    }
    // No Sec-Fetch-Site (older browsers, non-browser clients): fall back to an
    // Origin host match against the public host the proxy forwarded. Clients
    // that send neither header (curl, scripts) pass — CSRF is a browser attack
    // and they carry no ambient cookie.
    const origin = request.headers.get("origin");
    if (origin) {
      const expected =
        request.headers.get("x-forwarded-host") ??
        request.headers.get("host") ??
        request.nextUrl.host;
      try {
        if (new URL(origin).host !== expected) return blocked();
      } catch {
        return blocked();
      }
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
