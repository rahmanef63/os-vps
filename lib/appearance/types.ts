export type Theme = "light" | "dark";
export type Dir = "aqua" | "graphite" | "vivid";
// "auto" follows the active shell's own backdrop (per-OS fidelity); the rest
// are fixed presets (.wp-* classes in app/globals.css).
export type Wallpaper =
  | "auto" | "aurora" | "dusk" | "mist" | "graphite" | "noir"
  | "win11" | "material" | "ios";
export type Device = "auto" | "desktop" | "phone";
export type ServerMode = "mock" | "live";

/** Accessibility text-scale steps (root font-size multiplier). */
export const FONT_SCALES = [0.875, 1, 1.125, 1.25] as const;

export type Appearance = {
  theme: Theme;
  accent: string;
  dir: Dir;
  wallpaper: Wallpaper;
  reduceGlass: boolean;
  device: Device;
  /** Root font-size multiplier (a11y) — one of FONT_SCALES. */
  fontScale: number;
  /** Stronger borders + secondary text (a11y). */
  highContrast: boolean;
};

// No token field: the HTTP adapter authenticates with the signed session
// cookie (same-origin); a bearer token in localStorage would be a leak vector.
export type ServerConfig = {
  mode: ServerMode;
  url: string;
};

export type Tweaks = Appearance & { server: ServerConfig };

export const ACCENTS = [
  "#2f7bf6",
  "#7a5cff",
  "#ff5f8f",
  "#ff7a3d",
  "#16b8a6",
  "#34c759",
] as const;

export const TWEAK_DEFAULTS: Tweaks = {
  theme: "light",
  accent: "#2f7bf6",
  dir: "aqua",
  wallpaper: "auto",
  reduceGlass: false,
  device: "auto",
  fontScale: 1,
  highContrast: false,
  server: { mode: "mock", url: "" },
};
