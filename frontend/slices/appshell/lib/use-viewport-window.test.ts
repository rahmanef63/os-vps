// Tests for computeViewportWindow — the pure math that drives the DOM
// virtualization for any windowed list (files-manager, spotlight, future). The
// React hook layer is intentionally kept thin (event wiring only); this file
// pins the contract.
import { describe, expect, it } from "vitest";
import { computeViewportWindow } from "./use-viewport-window";

describe("computeViewportWindow", () => {
  it("returns zero-range when there are no items", () => {
    const w = computeViewportWindow({ scrollTop: 0, viewportHeight: 400, rowHeight: 28, total: 0 });
    expect(w).toEqual({ start: 0, end: 0, offsetTop: 0, totalHeight: 0 });
  });

  it("renders only the visible window + overscan", () => {
    // 1000 rows × 28px = 28000px total; viewport 400px starting at top.
    // visible rows: 0..ceil(400/28)=15. Overscan default 5 → start=0, end=20.
    const w = computeViewportWindow({ scrollTop: 0, viewportHeight: 400, rowHeight: 28, total: 1000, overscan: 5 });
    expect(w.start).toBe(0);
    expect(w.end).toBe(20);
    expect(w.offsetTop).toBe(0);
    expect(w.totalHeight).toBe(28000);
    // The slice size should be small relative to total — the whole point.
    expect(w.end - w.start).toBeLessThan(50);
  });

  it("advances start/end when scrolling", () => {
    // scrollTop=560 means rawStart = floor(560/28) = 20, rawEnd ceil(960/28)=35.
    // With overscan 5: start=15, end=40.
    const w = computeViewportWindow({
      scrollTop: 560,
      viewportHeight: 400,
      rowHeight: 28,
      total: 1000,
      overscan: 5,
    });
    expect(w.start).toBe(15);
    expect(w.end).toBe(40);
    expect(w.offsetTop).toBe(15 * 28);
  });

  it("clamps end to total at the bottom", () => {
    // Scrolled all the way down — end must not exceed total.
    const w = computeViewportWindow({
      scrollTop: 28000,
      viewportHeight: 400,
      rowHeight: 28,
      total: 1000,
      overscan: 5,
    });
    expect(w.end).toBe(1000);
    expect(w.start).toBeGreaterThan(900);
  });

  it("recomputes when viewportHeight changes (resize)", () => {
    const small = computeViewportWindow({ scrollTop: 0, viewportHeight: 200, rowHeight: 28, total: 1000 });
    const large = computeViewportWindow({ scrollTop: 0, viewportHeight: 800, rowHeight: 28, total: 1000 });
    expect(large.end).toBeGreaterThan(small.end);
  });

  it("treats negative scrollTop as zero (spacer below the fold)", () => {
    const w = computeViewportWindow({ scrollTop: -120, viewportHeight: 400, rowHeight: 28, total: 1000 });
    expect(w.start).toBe(0);
    expect(w.offsetTop).toBe(0);
  });

  it("uses the requested overscan when provided", () => {
    const a = computeViewportWindow({ scrollTop: 280, viewportHeight: 400, rowHeight: 28, total: 1000, overscan: 0 });
    const b = computeViewportWindow({ scrollTop: 280, viewportHeight: 400, rowHeight: 28, total: 1000, overscan: 20 });
    expect(b.end - b.start).toBeGreaterThan(a.end - a.start);
  });

  it("returns zero-range for non-positive rowHeight (defensive)", () => {
    const w = computeViewportWindow({ scrollTop: 0, viewportHeight: 400, rowHeight: 0, total: 100 });
    expect(w).toEqual({ start: 0, end: 0, offsetTop: 0, totalHeight: 0 });
  });
});
