"use client";

import { useEffect, useRef } from "react";
import { useEditor } from "../../lib/store";
import type { Layer } from "../../lib/types";

const SIZE = 30;

// A live per-layer thumbnail (28px canvas). Drawn from the layer's real content —
// the paint buffer, the loaded image, the shape fill, or a glyph for text — so
// the layers panel reads like Photoshop's. Redraws whenever the panel re-renders
// (i.e. on any doc/history change), which keeps it roughly live without polling.
export function LayerThumb({ layer }: { layer: Layer }) {
  const { canvasFor, doc } = useEditor();
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    // checker backdrop (shows transparency)
    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = "#cbd1d9";
    for (let y = 0; y < SIZE; y += 6) for (let x = 0; x < SIZE; x += 6) if (((x + y) / 6) % 2) ctx.fillRect(x, y, 6, 6);

    const fit = (iw: number, ih: number) => {
      const s = Math.min(SIZE / iw, SIZE / ih);
      return { w: iw * s, h: ih * s, x: (SIZE - iw * s) / 2, y: (SIZE - ih * s) / 2 };
    };

    if (layer.kind === "paint") {
      const c = canvasFor(layer.id, doc.width, doc.height);
      const f = fit(c.width, c.height);
      ctx.drawImage(c, f.x, f.y, f.w, f.h);
    } else if (layer.kind === "image" && layer.src) {
      const img = new window.Image();
      img.onload = () => { const f = fit(img.width, img.height); ctx.drawImage(img, f.x, f.y, f.w, f.h); };
      img.src = layer.src;
    } else if (layer.kind === "shape") {
      ctx.fillStyle = layer.fillType === "gradient" && layer.gradient ? layer.gradient.from : layer.fillColor ?? "#3b82f6";
      if (layer.shape === "ellipse") { ctx.beginPath(); ctx.ellipse(SIZE / 2, SIZE / 2, 11, 8, 0, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.fillRect(5, 7, 20, 16); }
    } else if (layer.kind === "adjustment") {
      // half-tone tile + "fx" to read as an adjustment layer
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, SIZE / 2, SIZE);
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(SIZE / 2, 0, SIZE / 2, SIZE);
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("fx", SIZE / 2, SIZE / 2 + 1);
    } else {
      ctx.fillStyle = layer.fill ?? "#111827";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("T", SIZE / 2, SIZE / 2 + 1);
    }
  });

  return <canvas ref={ref} width={SIZE} height={SIZE} className="size-[30px] shrink-0 rounded border border-border" />;
}
