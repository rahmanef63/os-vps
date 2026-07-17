// Build id baked into the client bundle so a redeploy can be detected.
const BUILD_ID =
  process.env.NEXT_PUBLIC_BUILD_ID ||
  process.env.NEXT_DEPLOYMENT_ID ||
  String(Date.now());

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cache Components off: os-vps is a fully dynamic app (auth-gated OS shell,
  // no SSG marketing pages), so static prerendering adds no value and conflicts
  // with the auth provider's cookie reads. Re-enable only if static routes land.
  cacheComponents: false,
  // The Browser app renders site favicons via Google's s2 service (fixed host)
  // through next/Image, so the optimizer caches/resizes them. Host filesystem
  // images + the live Playwright screenshot stream stay raw <img> on purpose —
  // they're dynamic/auth'd bytes the optimizer can't help with.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.google.com", pathname: "/s2/favicons/**" },
    ],
  },
  // node-pty is a native addon (.node binary) — it must be require()'d from
  // node_modules at runtime, never bundled, or the binding fails to load.
  serverExternalPackages: ["node-pty"],
  deploymentId: process.env.NEXT_DEPLOYMENT_ID || BUILD_ID,
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
  experimental: {
    // proxy.ts clones request bodies; the default clone cap is 10MB, which
    // silently truncated large /api/v1/fs/upload payloads. Raise it so big
    // media uploads land intact (proxy* is the Next 16 name of the option).
    // Kept just above the upload route's 200 MiB running cap (which streams to
    // disk and returns 413 past it) so the route — not the proxy — owns rejection.
    proxyClientMaxBodySize: "256mb",
    // Tree-shake heavy icon/radix barrels — keeps the OS shell bundle lean.
    optimizePackageImports: [
      "lucide-react",
      "radix-ui",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-popover",
      "@radix-ui/react-alert-dialog",
    ],
  },
  // Serve the service worker at /sw.js (stable scope) from the /api/sw route
  // handler. beforeFiles runs BEFORE page routing, so the optional catch-all
  // [[...slug]] never swallows /sw.js (a route under /api is never caught by it).
  async rewrites() {
    return {
      beforeFiles: [{ source: "/sw.js", destination: "/api/sw" }],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Authenticated remote shell over HTTPS — refuse any plaintext leg so
          // a MITM can't strip TLS and capture the session cookie before the
          // redirect fires. 1 year. includeSubDomains omitted on purpose: not
          // every rahmanef.com subdomain is HTTPS-only.
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // The app is an authenticated remote shell — never allow it to be
          // framed (clickjacking on exec/fs buttons). CSP stays narrow on
          // purpose: script/style/connect are NOT restricted because the shell
          // needs blob: workers (@imgly), data: images and the BYOK CDN fetch.
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default nextConfig;
