// Tight bounding box of a paint layer's actual pixels (non-transparent alpha),
// in canvas/doc coordinates. Returns null when the layer is EMPTY — used so the
// Move box hugs the drawn content instead of the full-canvas paint buffer, and
// so an empty layer shows no transform box at all. O(w·h); called only on
// selection/edit changes (Move tool + paint layer), never per frame.
export function contentBBox(
  canvas: HTMLCanvasElement,
): { x: number; y: number; w: number; h: number } | null {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  if (!ctx || !width || !height) return null;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] !== 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null; // fully transparent → empty
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
