"use client";

import { cn } from "@/lib/utils";
import { useShellAppearance } from "../registry/capabilities";
import { getWallpaper } from "../lib/wallpaper-registry";
import { useShellWallpaper } from "../lib/wallpaper-prefs";
import { useActiveShell } from "../registry/shells";
import type { LiveWallpaperValue } from "../registry/capabilities";

export function Wallpaper({ shellDefault }: { shellDefault?: string }) {
  const shell = useActiveShell().id;
  const override = useShellWallpaper(shell);
  const { wallpaper, wallpaperStyle, liveWallpaper } = useShellAppearance();
  // A per-shell override (Settings → Per-shell wallpaper) wins over the global
  // appearance for THIS shell: a "live:<id>" value → that live wallpaper; any
  // other value → the named `.wp-*` preset.
  if (override) {
    if (override.startsWith("live:")) return <LiveWallpaper value={{ kind: "component", id: override.slice(5) }} />;
    return <div className={cn(`wp-${override} absolute inset-0 z-0 transition-[background] duration-700`)} />;
  }
  // Priority: a live wallpaper (code component or sandboxed HTML) > custom image
  // > the named preset (or the shell's native "auto" backdrop).
  if (liveWallpaper) return <LiveWallpaper value={liveWallpaper} />;
  if (wallpaperStyle) {
    return <div style={wallpaperStyle} className="absolute inset-0 z-0 bg-cover bg-center transition-[background] duration-700" />;
  }
  const preset = !wallpaper || wallpaper === "auto" ? (shellDefault ?? "aurora") : wallpaper;
  return <div className={cn(`wp-${preset} absolute inset-0 z-0 transition-[background] duration-700`)} />;
}

function LiveWallpaper({ value }: { value: LiveWallpaperValue }) {
  // Click-through unless the user opted into interactivity; the shells turn the
  // empty desktop transparent to hits so an interactive wallpaper gets clicks.
  const pe = value.interactive ? "pointer-events-auto" : "pointer-events-none";

  if (value.kind === "html") {
    // SECURITY: user HTML runs in a sandboxed iframe with ONLY `allow-scripts`
    // — no `allow-same-origin`, so the frame is a unique opaque origin. It can
    // animate + run JS but CANNOT read the OS cookies/localStorage, reach the
    // parent DOM, or call /api/* as the signed-in user (its credentialed
    // same-origin requests are cross-origin from "null" and get no cookie).
    return (
      <iframe
        title="Live wallpaper"
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        srcDoc={value.html}
        className={cn("absolute inset-0 z-0 h-full w-full border-0 bg-background", pe)}
      />
    );
  }

  const desc = getWallpaper(value.id);
  if (!desc) {
    // Selected component isn't registered (e.g. removed since last session) —
    // fall back to a neutral backdrop rather than a blank void.
    return <div className="wp-graphite absolute inset-0 z-0" />;
  }
  const Render = desc.render;
  return (
    <div className={cn("absolute inset-0 z-0 overflow-hidden", pe)}>
      <Render interactive={value.interactive} />
    </div>
  );
}
