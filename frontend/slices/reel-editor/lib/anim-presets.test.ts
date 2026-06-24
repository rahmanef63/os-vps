import { describe, expect, it } from "vitest";
import { applyAnimPreset } from "./anim-presets";
import type { Clip } from "./mock-timeline";

function makeClip(len: number, kf: Clip["kf"] = {}): Clip {
  return {
    id: "test-clip",
    track: "t-video",
    name: "test.mp4",
    start: 0,
    len,
    color: "#fff",
    kind: "video",
    kf,
  };
}

// K = Math.max(6, Math.min(18, Math.round(len / 3)))
// len=60 → K=18 (clamped upper), len=15 → K=5→6 (clamped lower), len=30 → K=10

describe("applyAnimPreset — in-fade", () => {
  it("sets opacity track with 2 leading keyframes at t=0 and t=K", () => {
    const clip = makeClip(30);
    const kf = applyAnimPreset(clip, "in-fade");
    expect(kf.opacity).toBeDefined();
    expect(kf.opacity![0]).toEqual({ t: 0, v: 0, e: "out" });
    expect(kf.opacity![1]).toEqual({ t: 10, v: 100 });
  });

  it("does not touch scale or other tracks", () => {
    const clip = makeClip(30);
    const kf = applyAnimPreset(clip, "in-fade");
    expect(kf.scale).toBeUndefined();
    expect(kf.x).toBeUndefined();
    expect(kf.y).toBeUndefined();
  });
});

describe("applyAnimPreset — in-zoom", () => {
  it("sets both scale and opacity tracks", () => {
    const clip = makeClip(30);
    const kf = applyAnimPreset(clip, "in-zoom");
    expect(kf.scale).toBeDefined();
    expect(kf.opacity).toBeDefined();
  });

  it("scale starts at 55 and reaches 100 at K", () => {
    const clip = makeClip(30); // K=10
    const kf = applyAnimPreset(clip, "in-zoom");
    expect(kf.scale![0]).toEqual({ t: 0, v: 55, e: "out" });
    expect(kf.scale![1]).toEqual({ t: 10, v: 100 });
  });

  it("opacity starts at 0 and reaches 100 at K", () => {
    const clip = makeClip(30); // K=10
    const kf = applyAnimPreset(clip, "in-zoom");
    expect(kf.opacity![0]).toEqual({ t: 0, v: 0, e: "out" });
    expect(kf.opacity![1]).toEqual({ t: 10, v: 100 });
  });
});

describe("applyAnimPreset — in-rise", () => {
  it("sets y and opacity tracks, not scale", () => {
    const clip = makeClip(30);
    const kf = applyAnimPreset(clip, "in-rise");
    expect(kf.y).toBeDefined();
    expect(kf.opacity).toBeDefined();
    expect(kf.scale).toBeUndefined();
  });

  it("y starts at 18 and reaches 0 at K", () => {
    const clip = makeClip(30); // K=10
    const kf = applyAnimPreset(clip, "in-rise");
    expect(kf.y![0]).toEqual({ t: 0, v: 18, e: "out" });
    expect(kf.y![1]).toEqual({ t: 10, v: 0 });
  });
});

describe("applyAnimPreset — in-pop", () => {
  it("produces exactly 3 keyframes on scale (no opacity track)", () => {
    const clip = makeClip(30); // K=10
    const kf = applyAnimPreset(clip, "in-pop");
    expect(kf.scale).toHaveLength(3);
    expect(kf.opacity).toBeUndefined();
  });

  it("scale keyframes: t=0→55, t=round(K*0.7)→112, t=K→100", () => {
    const clip = makeClip(30); // K=10, round(10*0.7)=7
    const kf = applyAnimPreset(clip, "in-pop");
    expect(kf.scale![0]).toEqual({ t: 0, v: 55, e: "out" });
    expect(kf.scale![1]).toEqual({ t: 7, v: 112 });
    expect(kf.scale![2]).toEqual({ t: 10, v: 100 });
  });
});

describe("applyAnimPreset — out-fade", () => {
  it("sets opacity track ending at t=len with v=0", () => {
    const clip = makeClip(30); // K=10, len-K=20
    const kf = applyAnimPreset(clip, "out-fade");
    const last = kf.opacity![kf.opacity!.length - 1];
    expect(last).toEqual({ t: 30, v: 0 });
  });

  it("the penultimate keyframe is at t=len-K with v=100", () => {
    const clip = makeClip(30); // K=10, len-K=20
    const kf = applyAnimPreset(clip, "out-fade");
    const ops = kf.opacity!;
    expect(ops[ops.length - 2]).toEqual({ t: 20, v: 100, e: "in" });
  });
});

describe("applyAnimPreset — out-zoom", () => {
  it("sets both scale and opacity tracks", () => {
    const clip = makeClip(30);
    const kf = applyAnimPreset(clip, "out-zoom");
    expect(kf.scale).toBeDefined();
    expect(kf.opacity).toBeDefined();
  });

  it("scale ends at 60 at t=len", () => {
    const clip = makeClip(30); // K=10
    const kf = applyAnimPreset(clip, "out-zoom");
    const last = kf.scale![kf.scale!.length - 1];
    expect(last).toEqual({ t: 30, v: 60 });
  });

  it("opacity ends at 0 at t=len", () => {
    const clip = makeClip(30);
    const kf = applyAnimPreset(clip, "out-zoom");
    const last = kf.opacity![kf.opacity!.length - 1];
    expect(last).toEqual({ t: 30, v: 0 });
  });
});

describe("K clamping", () => {
  it("K is clamped to minimum 6 for a very short clip (len=9)", () => {
    // len=9 → round(9/3)=3 → clamped to 6
    const clip = makeClip(9);
    const kf = applyAnimPreset(clip, "in-fade");
    // second keyframe t must be 6 (the clamped K)
    expect(kf.opacity![1].t).toBe(6);
  });

  it("K is clamped to maximum 18 for a long clip (len=90)", () => {
    // len=90 → round(90/3)=30 → clamped to 18
    const clip = makeClip(90);
    const kf = applyAnimPreset(clip, "in-fade");
    expect(kf.opacity![1].t).toBe(18);
  });

  it("K is exactly 10 for len=30 (no clamping needed)", () => {
    const clip = makeClip(30);
    const kf = applyAnimPreset(clip, "in-fade");
    expect(kf.opacity![1].t).toBe(10);
  });
});

describe("tracks outside entrance/exit window are preserved", () => {
  it("in-fade keeps existing opacity keyframes that lie after K", () => {
    // K=10 for len=30; existing keyframe at t=20 should be preserved
    const clip = makeClip(30, {
      opacity: [{ t: 20, v: 50 }, { t: 30, v: 80 }],
    });
    const kf = applyAnimPreset(clip, "in-fade");
    // should have: [t=0,v=0], [t=10,v=100], [t=20,v=50], [t=30,v=80]
    expect(kf.opacity).toHaveLength(4);
    expect(kf.opacity![2]).toEqual({ t: 20, v: 50 });
    expect(kf.opacity![3]).toEqual({ t: 30, v: 80 });
  });

  it("in-fade drops existing opacity keyframes at or before K", () => {
    const clip = makeClip(30, {
      opacity: [{ t: 5, v: 70 }, { t: 10, v: 90 }],
    });
    const kf = applyAnimPreset(clip, "in-fade");
    // t=5 and t=10 are <= K=10, so they are filtered by tail(kf, K) which keeps t > K
    expect(kf.opacity).toHaveLength(2);
  });

  it("out-fade keeps existing opacity keyframes before the exit window", () => {
    // len=30, K=10 → exit window starts at t=20; keyframe at t=5 should survive
    const clip = makeClip(30, {
      opacity: [{ t: 5, v: 80 }],
    });
    const kf = applyAnimPreset(clip, "out-fade");
    // head keeps t < 20; then appends [t=20,v=100], [t=30,v=0]
    expect(kf.opacity![0]).toEqual({ t: 5, v: 80 });
  });

  it("unrelated tracks (e.g. rotate) are not touched by in-fade", () => {
    const clip = makeClip(30, {
      rotate: [{ t: 0, v: -10 }, { t: 15, v: 0 }],
    });
    const kf = applyAnimPreset(clip, "in-fade");
    expect(kf.rotate).toHaveLength(2);
    expect(kf.rotate![0]).toEqual({ t: 0, v: -10 });
  });
});

describe("unknown preset id leaves kf unchanged", () => {
  it("returns kf identical to clip.kf for an unrecognised preset", () => {
    const clip = makeClip(30, {
      opacity: [{ t: 0, v: 100 }],
      scale: [{ t: 0, v: 80 }],
    });
    const kf = applyAnimPreset(clip, "does-not-exist");
    expect(kf).toEqual(clip.kf);
  });

  it("returns kf identical to clip.kf when clip has no keyframes", () => {
    const clip = makeClip(30);
    const kf = applyAnimPreset(clip, "unknown-preset");
    expect(kf).toEqual({});
  });
});
