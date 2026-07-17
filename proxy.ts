// Next 16 renamed middleware.ts → proxy.ts. Two jobs:
//  1. CSRF depth-2 for mutating /api — every /api route already verifies the
//     signed session cookie via requireSession(); this adds the second factor
//     (mutating /api must come from our own origin), because those endpoints are
//     literal host shell and the SameSite=Strict cookie is a single point.
//  2. A per-request nonce + Content-Security-Policy on the HTML document. The app
//     is PUBLIC and renders untrusted host content (fs bytes, terminal output),
//     so a strict script-src is the XSS→host-RCE containment layer. Next reads
//     the nonce from the REQUEST content-security-policy header and auto-nonces
//     its own bootstrap + RSC inline scripts; x-nonce is our channel for the
//     hand-written theme-noflash script in app/layout.tsx.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function blocked() {
  return NextResponse.json({ error: "cross_origin_blocked" }, { status: 403 });
}

// Per-directive rationale (verified against real usage):
// - script-src: nonce (Next bootstrap/RSC/theme) + strict-dynamic (nonced
//   bootstrap pulls /_next chunks) + wasm-unsafe-eval (@imgly onnxruntime WASM).
// - style-src 'unsafe-inline': radix/konva/react + next/font inline styles;
//   ignored for scripts once a nonce is present (CSP3), so no XSS weakening.
// - img-src https:: quicklink favicons hit www.google.com directly + the stock
//   picker renders arbitrary Openverse/Unsplash hosts + "paste any image URL".
// - connect-src stays TIGHT (self + @imgly host): all AI/BYOK/stock/oauth fetches
//   are SERVER-side, so the browser only hits same-origin /api — the exfil gate.
// - frame-src https:: media-viewer PDF + widget "Embed" + app-store runtime iframes
//   load external URLs (each sandboxed). worker/child blob: = SW + onnx worker.
function contentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://staticimgly.com blob: data:",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "media-src 'self' blob: data:",
    "frame-src 'self' https: blob: data:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const isApi = request.nextUrl.pathname.startsWith("/api/");

  // CSRF depth-2 for mutating /api (unchanged semantics).
  if (MUTATING.has(request.method) && isApi) {
    // Sec-Fetch-Site is a forbidden header — when present it is authoritative.
    const site = request.headers.get("sec-fetch-site");
    if (site) {
      if (site !== "same-origin" && site !== "none") return blocked();
    } else {
      // Older/non-browser clients: Origin host match, else require the cookie.
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
      } else if (!request.cookies.get("session")) {
        return blocked();
      }
    }
  }

  // /api owns its own response headers (fs/raw sets `content-security-policy:
  // sandbox`, Cache-Control no-store) and serves no inline scripts — never stamp
  // the document CSP on it.
  if (isApi) return NextResponse.next();

  // Per-request nonce for the HTML document. Edge-safe (crypto + btoa, no
  // Buffer). Next reads the nonce from the REQUEST content-security-policy header
  // and auto-nonces its bootstrap + RSC scripts; x-nonce feeds our layout script.
  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
