import { NextResponse } from "next/server";

// Serve the service worker dynamically so its bytes change every deploy: the
// CACHE name (and header comment) embed the build id. A static public/sw.js is
// byte-identical across deploys, so the browser never sees an "update" and the
// "new version → reload" toast never fires (it only ever showed once, during a
// cache-name bump). With the id baked in, each deploy is a new SW → updatefound
// → waiting → toast (see app/register-sw.tsx). Caches ONLY icons + manifest;
// never JS chunks/HTML, so a redeploy can't strand a stale chunk.
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "dev";

const SW = `// os-vps service worker — build ${BUILD_ID}
const CACHE = "os-vps-${BUILD_ID}";
const ASSETS = ["/icon-192.png", "/icon-512.png", "/manifest.webmanifest"];
self.addEventListener("install", (e) => {
  // Take over as soon as the new SW is installed — don't sit in "waiting" until
  // the user taps a reload toast (easy to miss on mobile, so a phone can stay
  // stuck on an old cached shell). The page reloads once on controllerchange.
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})));
});
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!ASSETS.includes(url.pathname)) return;
  e.respondWith(
    caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req);
      return hit || fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; });
    }),
  );
});
`;

export function GET() {
  return new NextResponse(SW, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
