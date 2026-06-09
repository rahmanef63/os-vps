import type { MetadataRoute } from "next";

// PWA manifest (served at /manifest.webmanifest). Installable standalone app.
// `shortcuts` give the installed icon a long-press / right-click jump menu
// straight into an app (deep-linked via the catch-all route's slugs).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Topside — VPS cockpit",
    short_name: "Topside",
    description: "Mobile-first web cockpit for a headless Linux VPS.",
    lang: "en",
    dir: "ltr",
    categories: ["productivity", "utilities", "developer"],
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Terminal", short_name: "Terminal", url: "/terminal" },
      { name: "Files", short_name: "Files", url: "/files" },
      { name: "Quicklinks", short_name: "Quicklinks", url: "/links" },
      { name: "Settings", short_name: "Settings", url: "/settings" },
    ],
  };
}
