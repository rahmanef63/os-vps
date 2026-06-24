import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  GAP,
  TOPBAR,
  DOCK_RESERVE,
  spawnRect,
  snapZoneAt,
  workArea,
  setChromeInsets,
} from "./store-geometry";

const VW = 1280;
const VH = 800;

function stubViewport(vw = VW, vh = VH) {
  vi.stubGlobal("window", { innerWidth: vw, innerHeight: vh });
}

// ─── snapZoneAt ──────────────────────────────────────────────────────────────

describe("snapZoneAt", () => {
  beforeEach(() => stubViewport());
  afterEach(() => {
    vi.unstubAllGlobals();
    setChromeInsets({ top: TOPBAR, bottom: DOCK_RESERVE });
  });

  it("py < topInset+4 → 'top' anywhere horizontally", () => {
    // topInset=TOPBAR=30; threshold = 34
    expect(snapZoneAt(VW / 2, 0)).toBe("top");
    expect(snapZoneAt(VW / 2, 33)).toBe("top");
  });

  it("left edge mid → 'left'", () => {
    // px < 26, py in [120, VH-120]
    expect(snapZoneAt(10, VH / 2)).toBe("left");
  });

  it("top-left corner → 'tl'", () => {
    // px < 26, py < 120 but py >= topInset+4
    expect(snapZoneAt(10, 50)).toBe("tl");
  });

  it("bottom-left corner → 'bl'", () => {
    // px < 26, py > VH-120 = 680
    expect(snapZoneAt(10, VH - 50)).toBe("bl");
  });

  it("right edge mid → 'right'", () => {
    // px > VW-26=1254, py in [120, 680]
    expect(snapZoneAt(VW - 10, VH / 2)).toBe("right");
  });

  it("top-right corner → 'tr'", () => {
    // px > 1254, py < 120 but >= topInset+4
    expect(snapZoneAt(VW - 10, 50)).toBe("tr");
  });

  it("bottom-right corner → 'br'", () => {
    // px > 1254, py > 680
    expect(snapZoneAt(VW - 10, VH - 50)).toBe("br");
  });

  it("center of screen → null", () => {
    expect(snapZoneAt(VW / 2, VH / 2)).toBeNull();
  });
});

// ─── workArea / spawnRect cascade (regression) ───────────────────────────────

describe("spawnRect cascade clamp (regression)", () => {
  beforeEach(() => stubViewport());
  afterEach(() => {
    vi.unstubAllGlobals();
    setChromeInsets({ top: TOPBAR, bottom: DOCK_RESERVE });
  });

  it("cascades early windows from the classic origin", () => {
    expect(spawnRect(0, 720, 460)).toMatchObject({ x: 80, y: 64, w: 720, h: 460 });
    expect(spawnRect(2, 720, 460)).toMatchObject({ x: 80 + 56, y: 64 + 56 });
  });

  it("never lets the window cross the right/bottom work-area edge", () => {
    const { vw, bottom } = workArea();
    for (let n = 0; n < 12; n++) {
      const r = spawnRect(n, 900, 700);
      expect(r.x + r.w).toBeLessThanOrEqual(vw - GAP);
      expect(r.y + r.h).toBeLessThanOrEqual(bottom);
      expect(r.x).toBeGreaterThanOrEqual(GAP);
    }
  });
});
