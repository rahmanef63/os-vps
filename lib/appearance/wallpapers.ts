// SSOT for the built-in wallpaper presets. The visual `.wp-<key>` gradients live
// in app/globals.css (the CSS truth); THIS registry is the single TypeScript
// source for the keys, labels, and the `Wallpaper` union, so options.ts, the
// settings UI, and the appearance types can never drift. Add a wallpaper = one
// entry here + one `.wp-<key>` rule in globals.css. "auto" follows the active
// shell's own backdrop (ShellDescriptor.wallpaper) for per-OS fidelity.

export type Wallpaper =
  | "auto" | "aurora" | "dusk" | "mist" | "graphite" | "noir"
  | "win11" | "material" | "ios";

export type WallpaperPreset = {
  key: Wallpaper;
  label: string;
  hint?: string;
};

export const WALLPAPERS: readonly WallpaperPreset[] = [
  { key: "auto", label: "Auto", hint: "Follow active shell" },
  { key: "aurora", label: "Aurora" },
  { key: "dusk", label: "Dusk" },
  { key: "mist", label: "Mist" },
  { key: "graphite", label: "Graphite" },
  { key: "noir", label: "Noir" },
  { key: "win11", label: "Bloom" },
  { key: "material", label: "Material" },
  { key: "ios", label: "iOS" },
];

/** The globals.css class that paints a wallpaper key. */
export const wallpaperClass = (key: Wallpaper): string => `wp-${key}`;

/** Human label for a wallpaper key (falls back to the raw key). */
export function wallpaperLabel(key: Wallpaper): string {
  return WALLPAPERS.find((w) => w.key === key)?.label ?? key;
}
