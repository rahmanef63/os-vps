// One-click entrance/exit animation presets = canned keyframe templates.
// Applying a preset replaces only the properties it animates; other keyframe
// tracks on the clip are kept.

import type { Clip, KeyframeMap } from "./mock-timeline";

export type AnimPreset = { id: string; label: string; group: "in" | "out" };

export const ANIM_PRESETS: AnimPreset[] = [
  { id: "in-fade", label: "Fade", group: "in" },
  { id: "in-zoom", label: "Zoom", group: "in" },
  { id: "in-rise", label: "Rise", group: "in" },
  { id: "in-pop", label: "Pop", group: "in" },
  { id: "out-fade", label: "Fade", group: "out" },
  { id: "out-zoom", label: "Zoom", group: "out" },
];

/** Keyframes for `preset` merged over the clip's existing tracks. */
export function applyAnimPreset(clip: Clip, preset: string): KeyframeMap {
  const len = clip.len;
  const K = Math.max(6, Math.min(18, Math.round(len / 3)));
  const kf: KeyframeMap = { ...clip.kf };
  switch (preset) {
    case "in-fade":
      kf.opacity = [{ t: 0, v: 0, e: "out" }, { t: K, v: 100 }, ...tail(kf.opacity, K)];
      break;
    case "in-zoom":
      kf.scale = [{ t: 0, v: 55, e: "out" }, { t: K, v: 100 }, ...tail(kf.scale, K)];
      kf.opacity = [{ t: 0, v: 0, e: "out" }, { t: K, v: 100 }, ...tail(kf.opacity, K)];
      break;
    case "in-rise":
      kf.y = [{ t: 0, v: 18, e: "out" }, { t: K, v: 0 }, ...tail(kf.y, K)];
      kf.opacity = [{ t: 0, v: 0, e: "out" }, { t: K, v: 100 }, ...tail(kf.opacity, K)];
      break;
    case "in-pop":
      kf.scale = [{ t: 0, v: 55, e: "out" }, { t: Math.round(K * 0.7), v: 112 }, { t: K, v: 100 }, ...tail(kf.scale, K)];
      break;
    case "out-fade":
      kf.opacity = [...head(kf.opacity, len - K), { t: len - K, v: 100, e: "in" }, { t: len, v: 0 }];
      break;
    case "out-zoom":
      kf.scale = [...head(kf.scale, len - K), { t: len - K, v: 100, e: "in" }, { t: len, v: 60 }];
      kf.opacity = [...head(kf.opacity, len - K), { t: len - K, v: 100, e: "in" }, { t: len, v: 0 }];
      break;
  }
  return kf;
}

// Keep any existing keys AFTER the entrance window / BEFORE the exit window so
// in + out presets compose on the same property.
const tail = (keys: { t: number; v: number; e?: "linear" | "in" | "out" | "inout" | "hold" }[] | undefined, after: number) =>
  (keys ?? []).filter((k) => k.t > after);
const head = (keys: { t: number; v: number; e?: "linear" | "in" | "out" | "inout" | "hold" }[] | undefined, before: number) =>
  (keys ?? []).filter((k) => k.t < before);
