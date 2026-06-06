import type { MetadataRoute } from "next";

// PWA manifest (served at /manifest.webmanifest). Installable standalone app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Topside — VPS cockpit",
    short_name: "Topside",
    description: "Mobile-first web cockpit for a headless Linux VPS.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
