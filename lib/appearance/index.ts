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
  ACCENTS,
  type Tweaks,
  type Appearance,
  type ServerConfig,
  type Theme,
  type Dir,
  type Wallpaper,
  type Device,
  type ServerMode,
  type ServerTarget,
  type ServerTargetKind,
  type SshServerTarget,
} from "./types";
export { addSshTarget, effectiveServerTarget, ensureServerTargets, selectServerTarget, updateServerTarget } from "./server-targets";
