// Tweakcn color-preset types (ported from rr theme-presets slice, adapted to
// os-rr conventions: dark = [data-theme="dark"], persistence via Tweaks.preset).
export interface PresetItem {
  name: string;
  title: string;
  type?: string;
  description?: string;
  cssVars?: {
    theme?: Record<string, string>;
    light?: Record<string, string>;
    dark?: Record<string, string>;
  };
}

export interface PresetRegistry {
  name: string;
  items: PresetItem[];
}

export interface PresetGroup {
  id: string;
  label: string;
  items: PresetItem[];
}

export const PRESET_STYLE_ID = "os-theme-preset";
