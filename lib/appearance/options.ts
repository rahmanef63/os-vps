import { FONT_SCALES, type Device, type Theme, type Wallpaper } from "./types";
import { WALLPAPERS, wallpaperClass } from "./wallpapers";

export type Option<T extends string = string> = {
  value: T;
  label: string;
  hint?: string;
  className?: string;
};

export const THEME_MODE_OPTIONS: Option<Theme>[] = [
  { value: "light", label: "Light", hint: "Bright glass surfaces" },
  { value: "dark", label: "Dark", hint: "Dim system chrome" },
];

// Derived from the wallpapers.ts registry (SSOT) so labels/keys/classes never
// drift from the appearance type or globals.css.
export const WALLPAPER_OPTIONS: Option<Wallpaper>[] = WALLPAPERS.map((w) => ({
  value: w.key,
  label: w.label,
  hint: w.hint,
  className: wallpaperClass(w.key),
}));

export const DEVICE_OPTIONS: Option<Device>[] = [
  { value: "auto", label: "Auto", hint: "Match viewport" },
  { value: "desktop", label: "Desktop", hint: "Force desktop shell" },
  { value: "phone", label: "Phone", hint: "Force mobile shell" },
];

export const FONT_SCALE_OPTIONS = FONT_SCALES.map((value) => ({
  value: String(value),
  label: value === 1 ? "Default" : `${Math.round(value * 100)}%`,
  hint: value < 1 ? "Compact" : value > 1 ? "Larger" : "System",
}));

export { wallpaperLabel } from "./wallpapers";
