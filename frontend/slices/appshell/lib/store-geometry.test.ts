import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  GAP,
  TOPBAR,
  DOCK_RESERVE,
  snapRect,
  spawnRect,
  clampRect,
  setChromeInsets,
} from "./store-geometry";

// --- viewport constants used throughout ---
const VW = 1280;
const VH = 800;
// window-coord derived values (default chrome: TOPBAR=30, DOCK_RESERVE=92)
const TOP = GAP;                        // 8
const BOTTOM = VH - TOPBAR - DOCK_RESERVE; // 678
const AVAIL_H = BOTTOM - TOP;          // 670
const HALF_W = (VW - GAP * 3) / 2;    // 628
const RIGHT_X = GAP * 2 + HALF_W;     // 644
const HALF_H = (AVAIL_H - GAP) / 2;   // 331
const ROW_B = TOP + HALF_H + GAP;     // 347
const THIRD_W = (VW - GAP * 3) / 3;   // ≈418.67
const TWO_THIRD_W = THIRD_W * 2;      // ≈837.33

function stubViewport(vw = VW, vh = VH) {
  vi.stubGlobal("window", { innerWidth: vw, innerHeight: vh });
}

// ─── snapRect ────────────────────────────────────────────────────────────────

describe("snapRect — all 11 zones", () => {
  beforeEach(() => stubViewport());
  afterEach(() => {
    vi.unstubAllGlobals();
    setChromeInsets({ top: TOPBAR, bottom: DOCK_RESERVE });
  });

  it("left: x=GAP, y=TOP, w=halfW, h=availH", () => {
    const r = snapRect("left");
    expect(r.x).toBe(GAP);
    expect(r.y).toBe(TOP);
    expect(r.w).toBeCloseTo(HALF_W);
    expect(r.h).toBe(AVAIL_H);
  });

  it("right: x=rightX, y=TOP, w=halfW, h=availH", () => {
    const r = snapRect("right");
    expect(r.x).toBeCloseTo(RIGHT_X);
    expect(r.y).toBe(TOP);
    expect(r.w).toBeCloseTo(HALF_W);
    expect(r.h).toBe(AVAIL_H);
  });

  it("left+right span full width with single gutter — no gap, no overlap", () => {
    const l = snapRect("left");
    const r = snapRect("right");
    expect(r.x).toBeCloseTo(l.x + l.w + GAP);           // gutter between halves
    expect(l.x + l.w + GAP + r.w + GAP).toBeCloseTo(VW); // tiles to edge
  });

  it("top: full-width maximize rect", () => {
    const r = snapRect("top");
    expect(r.x).toBe(GAP);
    expect(r.y).toBe(TOP);
    expect(r.w).toBe(VW - GAP * 2);
    expect(r.h).toBe(AVAIL_H);
  });

  it("tl: top-left quadrant", () => {
    const r = snapRect("tl");
    expect(r.x).toBe(GAP);
    expect(r.y).toBe(TOP);
    expect(r.w).toBeCloseTo(HALF_W);
    expect(r.h).toBeCloseTo(HALF_H);
  });

  it("tr: top-right quadrant", () => {
    const r = snapRect("tr");
    expect(r.x).toBeCloseTo(RIGHT_X);
    expect(r.y).toBe(TOP);
    expect(r.w).toBeCloseTo(HALF_W);
    expect(r.h).toBeCloseTo(HALF_H);
  });

  it("bl: bottom-left quadrant starts at rowB", () => {
    const r = snapRect("bl");
    expect(r.x).toBe(GAP);
    expect(r.y).toBeCloseTo(ROW_B);
    expect(r.w).toBeCloseTo(HALF_W);
    expect(r.h).toBeCloseTo(HALF_H);
  });

  it("br: bottom-right quadrant", () => {
    const r = snapRect("br");
    expect(r.x).toBeCloseTo(RIGHT_X);
    expect(r.y).toBeCloseTo(ROW_B);
    expect(r.w).toBeCloseTo(HALF_W);
    expect(r.h).toBeCloseTo(HALF_H);
  });

  it("tl+bl stack: gutter between rows, bl bottom == BOTTOM", () => {
    const tl = snapRect("tl");
    const bl = snapRect("bl");
    expect(tl.y + tl.h + GAP).toBeCloseTo(bl.y);
    expect(bl.y + bl.h).toBeCloseTo(BOTTOM);
  });

  it("l13: left-third column", () => {
    const r = snapRect("l13");
    expect(r.x).toBe(GAP);
    expect(r.y).toBe(TOP);
    expect(r.w).toBeCloseTo(THIRD_W);
    expect(r.h).toBe(AVAIL_H);
  });

  it("r23: right two-thirds; l13+r23 tile full width", () => {
    const l = snapRect("l13");
    const r = snapRect("r23");
    expect(r.x).toBeCloseTo(GAP * 2 + THIRD_W);
    expect(r.w).toBeCloseTo(TWO_THIRD_W);
    expect(l.x + l.w + GAP + r.w + GAP).toBeCloseTo(VW);
  });

  it("l23: left two-thirds; r13 fills the rest, tiles full width", () => {
    const l = snapRect("l23");
    const r = snapRect("r13");
    expect(l.w).toBeCloseTo(TWO_THIRD_W);
    expect(r.w).toBeCloseTo(THIRD_W);
    expect(l.x + l.w + GAP + r.w + GAP).toBeCloseTo(VW);
  });

  it("every zone: x >= GAP and y >= GAP", () => {
    const zones = ["left","right","top","tl","tr","bl","br","l13","r23","l23","r13"] as const;
    for (const z of zones) {
      const r = snapRect(z);
      expect(r.x, `${z}.x`).toBeGreaterThanOrEqual(GAP);
      expect(r.y, `${z}.y`).toBeGreaterThanOrEqual(GAP);
    }
  });
});

// ─── spawnRect ───────────────────────────────────────────────────────────────

describe("spawnRect", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setChromeInsets({ top: TOPBAR, bottom: DOCK_RESERVE });
  });

  it("SSR fallback (no window): raw cascade, no clamping", () => {
    // window is not stubbed — node environment has no globalThis.window
    expect(spawnRect(0, 800, 600)).toEqual({ x: 80, y: 64, w: 800, h: 600 });
  });

  it("SSR: n=3 applies 3×28 offset", () => {
    expect(spawnRect(3, 400, 300)).toEqual({ x: 80 + 84, y: 64 + 84, w: 400, h: 300 });
  });

  it("n%6 wraps: n=6 same position as n=0", () => {
    stubViewport();
    expect(spawnRect(6, 400, 300)).toEqual(spawnRect(0, 400, 300));
  });

  it("n%6 wraps: n=7 same position as n=1", () => {
    stubViewport();
    expect(spawnRect(7, 400, 300)).toEqual(spawnRect(1, 400, 300));
  });

  it("x and y >= GAP with window present", () => {
    stubViewport();
    for (let n = 0; n < 6; n++) {
      const r = spawnRect(n, 400, 300);
      expect(r.x, `n=${n} x`).toBeGreaterThanOrEqual(GAP);
      expect(r.y, `n=${n} y`).toBeGreaterThanOrEqual(GAP);
    }
  });

  it("oversized width clamped to vw - GAP*2", () => {
    stubViewport();
    expect(spawnRect(0, 9999, 300).w).toBe(VW - GAP * 2);
  });

  it("oversized height clamped to work-area height", () => {
    stubViewport();
    expect(spawnRect(0, 400, 9999).h).toBe(BOTTOM - TOP);
  });

  it("normal window stays within work-area bounds", () => {
    stubViewport();
    const r = spawnRect(0, 400, 300);
    expect(r.x + r.w).toBeLessThanOrEqual(VW - GAP);
    expect(r.y + r.h).toBeLessThanOrEqual(BOTTOM);
  });
});

// ─── clampRect ───────────────────────────────────────────────────────────────

describe("clampRect", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setChromeInsets({ top: TOPBAR, bottom: DOCK_RESERVE });
  });

  it("SSR fallback: returns rect unchanged (even if coordinates are wild)", () => {
    const r = { x: -999, y: -999, w: 99999, h: 99999 };
    expect(clampRect(r)).toEqual(r);
  });

  it("in-bounds rect passes through unchanged", () => {
    stubViewport();
    const r = { x: 100, y: 100, w: 400, h: 200 };
    expect(clampRect(r)).toEqual(r);
  });

  it("oversized window shrinks to fit", () => {
    stubViewport();
    const r = clampRect({ x: GAP, y: TOP, w: 9999, h: 9999 });
    expect(r.w).toBe(VW - GAP * 2);
    expect(r.h).toBe(BOTTOM - TOP);
  });

  it("x off right edge nudged inward", () => {
    stubViewport();
    const W = 400;
    const r = clampRect({ x: 9999, y: TOP, w: W, h: 200 });
    expect(r.x).toBe(VW - GAP - W);
    expect(r.x + r.w).toBeLessThanOrEqual(VW - GAP);
  });

  it("y off bottom edge nudged up", () => {
    stubViewport();
    const H = 200;
    const r = clampRect({ x: GAP, y: 9999, w: 400, h: H });
    expect(r.y).toBe(BOTTOM - H);
    expect(r.y + r.h).toBeLessThanOrEqual(BOTTOM);
  });

  it("x < GAP clamped to GAP", () => {
    stubViewport();
    const r = clampRect({ x: -50, y: TOP, w: 400, h: 200 });
    expect(r.x).toBe(GAP);
  });

  it("y < TOP clamped to TOP (GAP)", () => {
    stubViewport();
    const r = clampRect({ x: GAP, y: -50, w: 400, h: 200 });
    expect(r.y).toBe(TOP);
  });
});
