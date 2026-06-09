import { FONT_SCALES, type Device, type Theme, type Wallpaper } from "./types";

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

export const WALLPAPER_OPTIONS: Option<Wallpaper>[] = [
  { value: "auto", label: "Auto", hint: "Follow active shell", className: "wp-auto" },
  { value: "aurora", label: "Aurora", className: "wp-aurora" },
  { value: "dusk", label: "Dusk", className: "wp-dusk" },
  { value: "mist", label: "Mist", className: "wp-mist" },
  { value: "graphite", label: "Graphite", className: "wp-graphite" },
  { value: "noir", label: "Noir", className: "wp-noir" },
  { value: "win11", label: "Bloom", className: "wp-win11" },
  { value: "material", label: "Material", className: "wp-material" },
  { value: "ios", label: "iOS", className: "wp-ios" },
];

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

export function wallpaperLabel(value: Wallpaper): string {
  return WALLPAPER_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
