import { FONT_SCALES, type Device, type Theme } from "./types";

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

// Wallpaper presets are gone on purpose: theme presets own color identity, the
// wallpaper is "auto" (per-shell backdrop) or a custom image (wallpapers.ts).

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
