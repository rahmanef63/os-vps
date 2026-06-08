// Generic, brand-free appearance contract. The CONSUMER (e.g. os-settings) builds
// this adapter from its own appearance store and the option lists it supports, so
// the panel UI carries no project-specific values — it just renders what it's given.

export type SettingOption = { value: string; label: string };

/** One segmented setting: current value + the choices + a setter. */
export type SegSetting = {
  value: string;
  options: SettingOption[];
  onChange: (value: string) => void;
};

/** The appearance surface the panel can render. All groups are optional — only
 * the ones the consumer provides are shown. */
export type AppearanceAdapter = {
  style?: SegSetting;
  /** Optional: consumers may render light/dark mode in a dedicated Theme page. */
  theme?: SegSetting;
  /** Accent swatches — options are literal color values (their own data). */
  accent?: { value: string; options: string[]; onChange: (color: string) => void };
  wallpaper?: SegSetting;
  /** OS-layout switchers (multi-shell): which chrome renders on each surface
   *  (desktop: macOS/Windows/Dashboard… · mobile: iOS/Android…). Optional —
   *  consumers without the shell registry simply omit them. */
  shellDesktop?: SegSetting;
  shellMobile?: SegSetting;
  /** Device override (Display section). */
  device?: SegSetting;
  reduceTransparency?: { value: boolean; onChange: (on: boolean) => void };
};
