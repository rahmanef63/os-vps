// Adjustment state + CSS `filter` string + named filter presets for the canvas.
// Re-authored from the os-rr media editor's filter model (theme-token UI only).

export type Adjustments = {
  brightness: number;
  contrast: number;
  saturate: number;
  hue: number;
  blur: number;
  sepia: number;
  grayscale: number;
};

export const ADJ_DEFAULT: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hue: 0,
  blur: 0,
  sepia: 0,
  grayscale: 0,
};

export type AdjustKey = keyof Adjustments;

export type SliderSpec = {
  key: AdjustKey;
  label: string;
  min: number;
  max: number;
  unit: string;
};

export const SLIDERS: SliderSpec[] = [
  { key: "brightness", label: "Brightness", min: 0, max: 200, unit: "%" },
  { key: "contrast", label: "Contrast", min: 0, max: 200, unit: "%" },
  { key: "saturate", label: "Saturation", min: 0, max: 200, unit: "%" },
  { key: "hue", label: "Hue", min: -180, max: 180, unit: "°" },
  { key: "blur", label: "Blur", min: 0, max: 10, unit: "px" },
  { key: "sepia", label: "Warmth", min: 0, max: 100, unit: "%" },
  { key: "grayscale", label: "Desaturate", min: 0, max: 100, unit: "%" },
];

/** Compose the CSS `filter` value applied to the preview block. */
export function filterStr(a: Partial<Adjustments>): string {
  const v = { ...ADJ_DEFAULT, ...a };
  return [
    `brightness(${v.brightness}%)`,
    `contrast(${v.contrast}%)`,
    `saturate(${v.saturate}%)`,
    `hue-rotate(${v.hue}deg)`,
    `blur(${v.blur}px)`,
    `sepia(${v.sepia}%)`,
    `grayscale(${v.grayscale}%)`,
  ].join(" ");
}

export type FilterPreset = { name: string; a: Partial<Adjustments> };

/** 8 named presets shown as chips — clicking applies its partial adjustment. */
export const FILTERS: FilterPreset[] = [
  { name: "Original", a: {} },
  { name: "Vivid", a: { saturate: 148, contrast: 112 } },
  { name: "Mono", a: { grayscale: 100, contrast: 108 } },
  { name: "Warm", a: { sepia: 34, saturate: 120, hue: -8 } },
  { name: "Cool", a: { hue: 18, saturate: 110, brightness: 104 } },
  { name: "Faded", a: { contrast: 88, brightness: 108, saturate: 78 } },
  { name: "Noir", a: { grayscale: 100, contrast: 130, brightness: 92 } },
  { name: "Dream", a: { blur: 1.2, saturate: 130, brightness: 108 } },
];
