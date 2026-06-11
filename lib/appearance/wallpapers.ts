// SSOT for wallpaper keys. The visual `.wp-<key>` gradients live in
// app/globals.css (the CSS truth). There is NO user-facing preset picker any
// more — color/identity comes from the theme presets (lib/appearance/presets);
// the wallpaper is either "auto" (each shell's native backdrop, the keys below)
// or a custom image via the image picker. Legacy stored keys (dusk/mist/noir/…)
// are coerced to "auto" by normalizeWallpaper on every hydrate path.

/** "auto" + the per-shell native backdrops (ShellDescriptor.wallpaper). */
export type Wallpaper = "auto" | "aurora" | "graphite" | "win11" | "material" | "ios";

const SHELL_KEYS: readonly Wallpaper[] = ["auto", "aurora", "graphite", "win11", "material", "ios"];

/** Coerce any stored/synced value (incl. removed legacy presets) to a valid key. */
export function normalizeWallpaper(value: unknown): Wallpaper {
  return SHELL_KEYS.includes(value as Wallpaper) ? (value as Wallpaper) : "auto";
}

/** The globals.css class that paints a wallpaper key. */
export const wallpaperClass = (key: Wallpaper): string => `wp-${key}`;

// ── Live (interactive) wallpaper ────────────────────────────────────────────
// Two sources: a code-registered TSX component (picked by id from the appshell
// wallpaper registry) or user-pasted HTML (rendered by the shell in a SANDBOXED
// iframe — allow-scripts only, opaque origin, no cookies/parent access).
// Structurally identical to appshell's LiveWallpaperValue so the capability
// adapter passes it straight through without lib/ importing the framework.
export type LiveWallpaper =
  | { kind: "component"; id: string; interactive?: boolean }
  | { kind: "html"; html: string; interactive?: boolean };

/** Paste cap — the value syncs through prefs/localStorage, so keep it bounded. */
export const LIVE_WALLPAPER_HTML_MAX = 256 * 1024;

/** Validate a stored/synced live-wallpaper value; anything malformed → null. */
export function normalizeLiveWallpaper(v: unknown): LiveWallpaper | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (o.kind === "component" && typeof o.id === "string" && o.id)
    return { kind: "component", id: o.id, interactive: o.interactive === true };
  if (o.kind === "html" && typeof o.html === "string" && o.html.trim() && o.html.length <= LIVE_WALLPAPER_HTML_MAX)
    return { kind: "html", html: o.html, interactive: o.interactive === true };
  return null;
}

/** Human label for a wallpaper key (settings header). */
export function wallpaperLabel(key: Wallpaper): string {
  return key === "auto" ? "Auto — follows shell & theme" : key;
}
