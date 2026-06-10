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

/** Human label for a wallpaper key (settings header). */
export function wallpaperLabel(key: Wallpaper): string {
  return key === "auto" ? "Auto — follows shell & theme" : key;
}
