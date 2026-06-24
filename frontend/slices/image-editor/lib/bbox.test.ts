import { describe, expect, it, vi } from "vitest";
import { contentBBox } from "./bbox";

// Build a mock HTMLCanvasElement without jsdom (jsdom is not installed).
// Only canvas.width, canvas.height, and canvas.getContext("2d") are needed.
function makeCanvas(
  width: number,
  height: number,
  pixels: Uint8ClampedArray,
  nullCtx = false,
): HTMLCanvasElement {
  const fakeCtx = nullCtx
    ? null
    : { getImageData: vi.fn().mockReturnValue({ data: pixels }) };

  return {
    width,
    height,
    getContext: vi.fn().mockReturnValue(fakeCtx),
  } as unknown as HTMLCanvasElement;
}

// All-transparent (alpha = 0).
function transparentBuf(w: number, h: number): Uint8ClampedArray {
  return new Uint8ClampedArray(w * h * 4);
}

// All-opaque (alpha = 255 for every pixel).
function opaqueBuf(w: number, h: number): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) buf[i * 4 + 3] = 255;
  return buf;
}

// Single opaque pixel at (px, py); rest transparent.
function singlePixelBuf(w: number, h: number, px: number, py: number): Uint8ClampedArray {
  const buf = transparentBuf(w, h);
  buf[(py * w + px) * 4 + 3] = 255;
  return buf;
}

// Rect [x0,x1) × [y0,y1) opaque; rest transparent.
function rectBuf(w: number, h: number, x0: number, y0: number, x1: number, y1: number): Uint8ClampedArray {
  const buf = transparentBuf(w, h);
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++)
      buf[(y * w + x) * 4 + 3] = 200;
  return buf;
}

describe("contentBBox — guard / null cases", () => {
  it("returns null when getContext returns null", () => {
    const canvas = makeCanvas(4, 4, transparentBuf(4, 4), /* nullCtx */ true);
    expect(contentBBox(canvas)).toBeNull();
  });

  it("returns null when width is 0", () => {
    const canvas = makeCanvas(0, 4, new Uint8ClampedArray(0));
    expect(contentBBox(canvas)).toBeNull();
  });

  it("returns null when height is 0", () => {
    const canvas = makeCanvas(4, 0, new Uint8ClampedArray(0));
    expect(contentBBox(canvas)).toBeNull();
  });
});

describe("contentBBox — all-transparent canvas", () => {
  it("returns null for a 4×4 canvas where every alpha is 0", () => {
    const canvas = makeCanvas(4, 4, transparentBuf(4, 4));
    expect(contentBBox(canvas)).toBeNull();
  });

  it("returns null for a 1×1 canvas with alpha 0", () => {
    const canvas = makeCanvas(1, 1, transparentBuf(1, 1));
    expect(contentBBox(canvas)).toBeNull();
  });
});

describe("contentBBox — single opaque pixel", () => {
  it("returns {x:0,y:0,w:1,h:1} for the top-left pixel", () => {
    const canvas = makeCanvas(4, 4, singlePixelBuf(4, 4, 0, 0));
    expect(contentBBox(canvas)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it("returns {x:3,y:3,w:1,h:1} for the bottom-right pixel", () => {
    const canvas = makeCanvas(4, 4, singlePixelBuf(4, 4, 3, 3));
    expect(contentBBox(canvas)).toEqual({ x: 3, y: 3, w: 1, h: 1 });
  });

  it("returns exact coords for a pixel at (2,1)", () => {
    const canvas = makeCanvas(5, 5, singlePixelBuf(5, 5, 2, 1));
    expect(contentBBox(canvas)).toEqual({ x: 2, y: 1, w: 1, h: 1 });
  });
});

describe("contentBBox — fully opaque canvas", () => {
  it("returns {x:0,y:0,w:4,h:3} for a 4×3 all-opaque canvas", () => {
    const canvas = makeCanvas(4, 3, opaqueBuf(4, 3));
    expect(contentBBox(canvas)).toEqual({ x: 0, y: 0, w: 4, h: 3 });
  });

  it("returns {x:0,y:0,w:1,h:1} for a 1×1 opaque canvas", () => {
    const canvas = makeCanvas(1, 1, opaqueBuf(1, 1));
    expect(contentBBox(canvas)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });
});

describe("contentBBox — partial opaque region (tight bbox)", () => {
  it("hugs a 2×2 rect at (1,1) in a 4×4 canvas", () => {
    const canvas = makeCanvas(4, 4, rectBuf(4, 4, 1, 1, 3, 3));
    expect(contentBBox(canvas)).toEqual({ x: 1, y: 1, w: 2, h: 2 });
  });

  it("hugs a single row y=2 in a 5×5 canvas", () => {
    const canvas = makeCanvas(5, 5, rectBuf(5, 5, 0, 2, 5, 3));
    expect(contentBBox(canvas)).toEqual({ x: 0, y: 2, w: 5, h: 1 });
  });

  it("hugs a single column x=3 in a 6×4 canvas", () => {
    const canvas = makeCanvas(6, 4, rectBuf(6, 4, 3, 0, 4, 4));
    expect(contentBBox(canvas)).toEqual({ x: 3, y: 0, w: 1, h: 4 });
  });

  it("spans from top-left to bottom-right when only corners are opaque", () => {
    const w = 6, h = 6;
    const buf = transparentBuf(w, h);
    buf[(0 * w + 0) * 4 + 3] = 1;
    buf[((h - 1) * w + (w - 1)) * 4 + 3] = 1;
    const canvas = makeCanvas(w, h, buf);
    expect(contentBBox(canvas)).toEqual({ x: 0, y: 0, w: 6, h: 6 });
  });

  it("treats alpha=1 (barely non-zero) as opaque", () => {
    const buf = transparentBuf(3, 3);
    buf[(1 * 3 + 1) * 4 + 3] = 1; // center, alpha=1
    const canvas = makeCanvas(3, 3, buf);
    expect(contentBBox(canvas)).toEqual({ x: 1, y: 1, w: 1, h: 1 });
  });

  it("ignores non-alpha channels when alpha is 0", () => {
    const buf = transparentBuf(3, 3);
    // Set RGB but keep alpha=0 — should still be transparent
    buf[0] = 255; buf[1] = 128; buf[2] = 64; // R,G,B; alpha[3] stays 0
    const canvas = makeCanvas(3, 3, buf);
    expect(contentBBox(canvas)).toBeNull();
  });
});
