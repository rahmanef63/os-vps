import type { MetadataRoute } from "next";

// PWA manifest (served at /manifest.webmanifest). Installable standalone app.
// `shortcuts` give the installed icon a long-press / right-click jump menu
// straight into an app (deep-linked via the catch-all route's slugs).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Manef Shell OS",
    short_name: "MSO",
    description: "A browser-based graphical shell for a Linux server you own — terminal, files, metrics, and AI in one mobile-first pane.",
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
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Terminal", short_name: "Terminal", url: "/terminal" },
      { name: "Files", short_name: "Files", url: "/files" },
      { name: "Quicklinks", short_name: "Quicklinks", url: "/links" },
      { name: "Settings", short_name: "Settings", url: "/settings" },
    ],
  };
}
