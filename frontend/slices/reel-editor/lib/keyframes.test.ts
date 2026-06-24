import { describe, expect, it } from "vitest";
import {
  applyEase,
  animatedCount,
  removeKeyAt,
  sampleKeys,
  setEaseAt,
  upsertKey,
} from "./keyframes";
import type { Clip, Keyframe } from "./mock-timeline";

// ---------------------------------------------------------------------------
// applyEase
// ---------------------------------------------------------------------------
describe("applyEase", () => {
  it("linear: p=0 → 0, p=0.5 → 0.5, p=1 → 1", () => {
    expect(applyEase(0, "linear")).toBe(0);
    expect(applyEase(0.5, "linear")).toBe(0.5);
    expect(applyEase(1, "linear")).toBe(1);
  });

  it("default (no ease arg) behaves like linear", () => {
    expect(applyEase(0.5)).toBe(0.5);
  });

  it("in (ease-in quad): p=0 → 0, p=0.5 → 0.25, p=1 → 1", () => {
    expect(applyEase(0, "in")).toBe(0);
    expect(applyEase(0.5, "in")).toBeCloseTo(0.25);
    expect(applyEase(1, "in")).toBe(1);
  });

  it("out (ease-out quad): p=0 → 0, p=0.5 → 0.75, p=1 → 1", () => {
    expect(applyEase(0, "out")).toBe(0);
    expect(applyEase(0.5, "out")).toBeCloseTo(0.75);
    expect(applyEase(1, "out")).toBe(1);
  });

  it("inout: p=0 → 0, p=0.5 → 0.5, p=1 → 1", () => {
    expect(applyEase(0, "inout")).toBe(0);
    expect(applyEase(0.5, "inout")).toBeCloseTo(0.5);
    expect(applyEase(1, "inout")).toBeCloseTo(1);
  });

  it("hold (step): p<1 → 0, p>=1 → 1", () => {
    expect(applyEase(0, "hold")).toBe(0);
    expect(applyEase(0.5, "hold")).toBe(0);
    expect(applyEase(0.999, "hold")).toBe(0);
    expect(applyEase(1, "hold")).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// sampleKeys
// ---------------------------------------------------------------------------
describe("sampleKeys", () => {
  const keys: Keyframe[] = [
    { t: 0, v: 0 },
    { t: 10, v: 100 },
    { t: 20, v: 50 },
  ];

  it("empty array → fallback", () => {
    expect(sampleKeys([], 5, 42)).toBe(42);
  });

  it("undefined → fallback", () => {
    expect(sampleKeys(undefined, 5, 42)).toBe(42);
  });

  it("f before first keyframe → first value", () => {
    expect(sampleKeys(keys, -5, 99)).toBe(0);
  });

  it("f at first keyframe → first value", () => {
    expect(sampleKeys(keys, 0, 99)).toBe(0);
  });

  it("f after last keyframe → last value", () => {
    expect(sampleKeys(keys, 25, 99)).toBe(50);
  });

  it("f at last keyframe → last value", () => {
    expect(sampleKeys(keys, 20, 99)).toBe(50);
  });

  it("f at an interior keyframe → exact value (linear)", () => {
    expect(sampleKeys(keys, 10, 99)).toBe(100);
  });

  it("interpolates midpoint linearly between first two keys", () => {
    // t=5 is halfway between t=0(v=0) and t=10(v=100), linear ease
    expect(sampleKeys(keys, 5, 99)).toBeCloseTo(50);
  });

  it("interpolates midpoint linearly between second and third key", () => {
    // t=15 is halfway between t=10(v=100) and t=20(v=50)
    expect(sampleKeys(keys, 15, 99)).toBeCloseTo(75);
  });

  it("single keyframe: f<t → that value", () => {
    const single: Keyframe[] = [{ t: 5, v: 77 }];
    expect(sampleKeys(single, 0, 99)).toBe(77);
  });

  it("single keyframe: f>t → that value", () => {
    const single: Keyframe[] = [{ t: 5, v: 77 }];
    expect(sampleKeys(single, 10, 99)).toBe(77);
  });

  it("ease=in: midpoint value is below linear midpoint", () => {
    const eased: Keyframe[] = [
      { t: 0, v: 0, e: "in" },
      { t: 10, v: 100 },
    ];
    // p=0.5 with ease-in → applyEase(0.5,'in')=0.25 → v=25
    expect(sampleKeys(eased, 5, 99)).toBeCloseTo(25);
  });

  it("ease=out: midpoint value is above linear midpoint", () => {
    const eased: Keyframe[] = [
      { t: 0, v: 0, e: "out" },
      { t: 10, v: 100 },
    ];
    // p=0.5 with ease-out → applyEase(0.5,'out')=0.75 → v=75
    expect(sampleKeys(eased, 5, 99)).toBeCloseTo(75);
  });

  it("ease=hold: value stays at start until last frame of segment", () => {
    const held: Keyframe[] = [
      { t: 0, v: 10, e: "hold" },
      { t: 10, v: 90 },
    ];
    // any f in (0,10) → p<1 → applyEase=0 → stays at 10
    expect(sampleKeys(held, 5, 99)).toBeCloseTo(10);
    // f=10 hits the `f >= last.t` branch → returns last.v = 90
    expect(sampleKeys(held, 10, 99)).toBe(90);
  });
});

// ---------------------------------------------------------------------------
// upsertKey
// ---------------------------------------------------------------------------
describe("upsertKey", () => {
  it("inserts into empty array", () => {
    expect(upsertKey(undefined, 5, 50)).toEqual([{ t: 5, v: 50 }]);
  });

  it("inserts and keeps sorted asc by t", () => {
    const result = upsertKey([{ t: 10, v: 100 }], 0, 0);
    expect(result).toEqual([
      { t: 0, v: 0 },
      { t: 10, v: 100 },
    ]);
  });

  it("inserts in the middle and maintains order", () => {
    const keys: Keyframe[] = [{ t: 0, v: 0 }, { t: 20, v: 200 }];
    const result = upsertKey(keys, 10, 100);
    expect(result.map((k) => k.t)).toEqual([0, 10, 20]);
  });

  it("replaces an existing keyframe at the same t", () => {
    const keys: Keyframe[] = [{ t: 5, v: 50 }];
    const result = upsertKey(keys, 5, 99);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ t: 5, v: 99 });
  });
});

// ---------------------------------------------------------------------------
// removeKeyAt
// ---------------------------------------------------------------------------
describe("removeKeyAt", () => {
  it("removes the keyframe matching t", () => {
    const keys: Keyframe[] = [{ t: 0, v: 0 }, { t: 10, v: 100 }, { t: 20, v: 50 }];
    const result = removeKeyAt(keys, 10);
    expect(result.map((k) => k.t)).toEqual([0, 20]);
  });

  it("leaves other keyframes untouched", () => {
    const keys: Keyframe[] = [{ t: 0, v: 0 }, { t: 10, v: 100 }];
    const result = removeKeyAt(keys, 0);
    expect(result).toEqual([{ t: 10, v: 100 }]);
  });

  it("noop when t not found", () => {
    const keys: Keyframe[] = [{ t: 5, v: 50 }];
    const result = removeKeyAt(keys, 99);
    expect(result).toEqual(keys);
  });

  it("noop on undefined", () => {
    expect(removeKeyAt(undefined, 5)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// setEaseAt
// ---------------------------------------------------------------------------
describe("setEaseAt", () => {
  it("sets ease on matching keyframe", () => {
    const keys: Keyframe[] = [{ t: 0, v: 0 }, { t: 10, v: 100 }];
    const result = setEaseAt(keys, 0, "inout");
    expect(result[0].e).toBe("inout");
    expect(result[1].e).toBeUndefined();
  });

  it("no-ops on undefined", () => {
    expect(setEaseAt(undefined, 5, "hold")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// animatedCount
// ---------------------------------------------------------------------------
describe("animatedCount", () => {
  const base: Clip = {
    id: "c1", track: "t1", name: "clip", start: 0, len: 30,
    color: "#fff", kind: "video",
  };

  it("returns 0 when kf is absent", () => {
    expect(animatedCount({ ...base })).toBe(0);
  });

  it("returns 0 when kf is empty object", () => {
    expect(animatedCount({ ...base, kf: {} })).toBe(0);
  });

  it("returns 1 when only one prop has keyframes", () => {
    expect(animatedCount({ ...base, kf: { opacity: [{ t: 0, v: 100 }] } })).toBe(1);
  });

  it("counts only props that have at least one keyframe", () => {
    expect(animatedCount({
      ...base,
      kf: {
        opacity: [{ t: 0, v: 100 }],
        scale: [{ t: 0, v: 100 }],
        x: [],
      },
    })).toBe(2);
  });
});
