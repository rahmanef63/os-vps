export { AppearanceProvider, useAppearance } from "./store";
export {
  loadPresetRegistry,
  findPreset,
  presetSwatches,
  groupPresets,
} from "./presets/registry";
export type { PresetItem, PresetGroup } from "./presets/types";
export {
  FONT_SCALES,
  TWEAK_DEFAULTS,
  type Tweaks,
  type Appearance,
  type ServerConfig,
  type Theme,
  type Wallpaper,
  type Device,
  type ServerMode,
  type ServerTarget,
  type ServerTargetKind,
  type SshServerTarget,
} from "./types";
export { addSshTarget, effectiveServerTarget, ensureServerTargets, selectServerTarget, updateServerTarget } from "./server-targets";
export {
  DEVICE_OPTIONS,
  FONT_SCALE_OPTIONS,
  THEME_MODE_OPTIONS,
  WALLPAPER_OPTIONS,
  wallpaperLabel,
} from "./options";
export { FONT_OPTIONS, fontStack, asFontKey, type FontKey, type FontOption } from "./fonts";
export { WALLPAPERS, wallpaperClass, type WallpaperPreset } from "./wallpapers";
export { uploadWallpaper, WALLPAPER_DIR } from "./wallpaper-upload";
