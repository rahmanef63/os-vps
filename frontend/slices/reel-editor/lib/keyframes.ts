// Keyframe model: property definitions, linear interpolation, and value sampling.
// Pure functions, no React. Frames are clip-local (0..clip.len).

import type { Clip, Ease, KfProp, Keyframe } from "./mock-timeline";

export const EASES: { e: Ease; label: string }[] = [
  { e: "linear", label: "Lin" },
  { e: "in", label: "In" },
  { e: "out", label: "Out" },
  { e: "inout", label: "I/O" },
  { e: "hold", label: "Hold" },
];

/** Map a 0..1 segment progress through an easing curve. */
export function applyEase(p: number, e: Ease = "linear"): number {
  switch (e) {
    case "in":
      return p * p;
    case "out":
      return 1 - (1 - p) * (1 - p);
    case "inout":
      return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    case "hold":
      return p >= 1 ? 1 : 0;
    default:
      return p;
  }
}

export type KfDef = {
  k: KfProp;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
};

export const KF_PROPS: KfDef[] = [
  { k: "opacity", label: "Opacity", min: 0, max: 100, step: 1, unit: "%" },
  { k: "scale", label: "Scale", min: 0, max: 300, step: 1, unit: "%" },
  { k: "x", label: "Position X", min: -100, max: 100, step: 1, unit: "%" },
  { k: "y", label: "Position Y", min: -100, max: 100, step: 1, unit: "%" },
  { k: "rotate", label: "Rotation", min: -180, max: 180, step: 1, unit: "°" },
];

export const KF_DEFAULT: Record<KfProp, number> = {
  opacity: 100,
  scale: 100,
  x: 0,
  y: 0,
  rotate: 0,
};

/** Interpolate a keyframe track at local frame `f`, easing each segment by the
 *  start keyframe's `e` (default linear). */
export function sampleKeys(keys: Keyframe[] | undefined, f: number, fallback: number): number {
  if (!keys || !keys.length) return fallback;
  if (f <= keys[0].t) return keys[0].v;
  const last = keys[keys.length - 1];
  if (f >= last.t) return last.v;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (f >= a.t && f <= b.t) {
      const p = (f - a.t) / (b.t - a.t || 1);
      return a.v + (b.v - a.v) * applyEase(p, a.e);
    }
  }
  return fallback;
}

/** Set the easing on the keyframe at local frame `t` (returns a new array). */
export function setEaseAt(keys: Keyframe[] | undefined, t: number, e: Ease): Keyframe[] {
  return (keys ?? []).map((k) => (k.t === t ? { ...k, e } : k));
}

/** Resolve a property value for a clip at clip-local frame, keyframes win over base. */
export function clipVal(clip: Clip, k: KfProp, local: number): number {
  const base = clip.base?.[k] ?? KF_DEFAULT[k];
  const keys = clip.kf?.[k];
  return keys?.length ? sampleKeys(keys, local, base) : base;
}

/** Insert/replace a keyframe at `t`, returning a sorted copy. */
export function upsertKey(keys: Keyframe[] | undefined, t: number, v: number): Keyframe[] {
  const next = (keys ?? []).filter((x) => x.t !== t);
  next.push({ t, v });
  return next.sort((a, b) => a.t - b.t);
}

/** Remove the keyframe at `t`. */
export function removeKeyAt(keys: Keyframe[] | undefined, t: number): Keyframe[] {
  return (keys ?? []).filter((x) => x.t !== t);
}

/** Count properties that currently carry keyframes. */
export function animatedCount(clip: Clip): number {
  if (!clip.kf) return 0;
  return Object.values(clip.kf).filter((ks) => ks && ks.length).length;
}
