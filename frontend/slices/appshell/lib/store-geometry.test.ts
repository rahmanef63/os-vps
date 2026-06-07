import { describe, expect, it, vi } from "vitest";
import { GAP, spawnRect, workArea } from "./store-geometry";

// spawnRect reads window.innerWidth/Height — stub a 1280x800 viewport.
vi.stubGlobal("window", Object.assign(globalThis.window ?? {}, { innerWidth: 1280, innerHeight: 800 }));

describe("spawnRect (cascade clamp)", () => {
  it("cascades early windows from the classic origin", () => {
    expect(spawnRect(0, 720, 460)).toMatchObject({ x: 80, y: 64, w: 720, h: 460 });
    expect(spawnRect(2, 720, 460)).toMatchObject({ x: 80 + 56, y: 64 + 56 });
  });

  it("wraps the cascade instead of marching forever", () => {
    expect(spawnRect(6, 720, 460)).toMatchObject({ x: 80, y: 64 }); // 6 % 6 = 0
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

  it("shrinks oversized windows to fit the work area", () => {
    const { vw, top, bottom } = workArea();
    const r = spawnRect(0, 5000, 5000);
    expect(r.w).toBe(vw - GAP * 2);
    expect(r.h).toBe(bottom - top);
  });
});
