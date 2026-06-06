"use client";

import { useRef } from "react";
import { Rect } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEditor } from "../../lib/store";
import { maskKey } from "../../lib/mask";

// Transparent full-doc surface that captures brush strokes onto the SELECTED
// layer's mask while mask-editing. Brush HIDES (erases mask alpha), Eraser
// REVEALS (paints opaque) — Photoshop semantics. The masked layer re-caches on
// stroke end (recordPaint → history version bump) so the result shows then.
export function MaskSurface({ layerId }: { layerId: string }) {
  const { doc, tool, brush, canvasFor, recordPaint } = useEditor();
  const canvas = canvasFor(maskKey(layerId), doc.width, doc.height);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const before = useRef<string | null>(null);
  const active = tool === "brush" || tool === "eraser";

  const strokeTo = (x: number, y: number) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brush.size;
    if (tool === "brush") ctx.globalCompositeOperation = "destination-out"; // hide
    else { ctx.globalCompositeOperation = "source-over"; ctx.strokeStyle = "#fff"; } // reveal
    ctx.beginPath();
    const p = last.current ?? { x, y };
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();
    last.current = { x, y };
  };

  const start = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!active) return;
    e.cancelBubble = true;
    before.current = canvas.toDataURL();
    drawing.current = true;
    last.current = null;
    const pt = e.target.getRelativePointerPosition();
    if (pt) strokeTo(pt.x, pt.y);
  };
  const move = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!active || !drawing.current) return;
    const pt = e.target.getRelativePointerPosition();
    if (pt) strokeTo(pt.x, pt.y);
  };
  const end = () => {
    if (drawing.current && before.current) recordPaint(maskKey(layerId), before.current, canvas.toDataURL());
    before.current = null;
    drawing.current = false;
    last.current = null;
  };

  return (
    <Rect
      x={0}
      y={0}
      width={doc.width}
      height={doc.height}
      fill="#000"
      opacity={0.001}
      onMouseDown={start}
      onTouchStart={start}
      onMouseMove={move}
      onTouchMove={move}
      onMouseUp={end}
      onTouchEnd={end}
      onMouseLeave={end}
    />
  );
}
