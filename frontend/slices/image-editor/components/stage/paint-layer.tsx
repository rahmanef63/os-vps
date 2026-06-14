"use client";

import { useEffect, useRef } from "react";
import { Image as KonvaImage } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEditor } from "../../lib/store";
import type { Layer } from "../../lib/types";
import { blendToGCO, shadowProps } from "../../lib/konva-helpers";
import { snapshotCanvas } from "../../lib/snapshot";

// A paint layer: a Konva.Image backed by an offscreen <canvas> the brush/eraser
// draw onto. Painting is active only when the brush/eraser tool is selected AND
// this layer is the current selection; otherwise it behaves like any layer
// (move/transform). Coordinates come from getRelativePointerPosition() so the
// stroke lands correctly regardless of zoom/pan/layer transform.
export function PaintLayer({
  layer,
  isSelected,
  nodeRef,
  onSelect,
  onChange,
}: {
  layer: Layer;
  isSelected: boolean;
  nodeRef: (node: Konva.Image | null) => void;
  onSelect: () => void;
  onChange: (patch: Partial<Layer>) => void;
}) {
  const { doc, tool, brush, canvasFor, recordPaint } = useEditor();
  const ref = useRef<Konva.Image | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const strokeBefore = useRef<string | null>(null);
  const canvas = canvasFor(layer.id, doc.width, doc.height);
  const painting = (tool === "brush" || tool === "eraser") && isSelected && !layer.locked;

  useEffect(() => {
    ref.current?.getLayer()?.batchDraw();
  }, [canvas]);

  function strokeTo(x: number, y: number) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brush.size;
    ctx.globalAlpha = brush.opacity;
    if (tool === "eraser") ctx.globalCompositeOperation = "destination-out";
    else {
      ctx.strokeStyle = brush.color;
      ctx.shadowColor = brush.color;
      ctx.shadowBlur = (1 - brush.hardness) * brush.size * 0.6;
    }
    ctx.beginPath();
    const p = last.current ?? { x, y };
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();
    last.current = { x, y };
    ref.current?.getLayer()?.batchDraw();
  }

  const start = async (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!painting) return;
    e.cancelBubble = true;
    // Snapshot pixels BEFORE the stroke so the whole stroke is one undo step.
    // Blob+ObjectURL keeps RAM bounded; history revokes on eviction.
    strokeBefore.current = await snapshotCanvas(canvas);
    drawing.current = true;
    last.current = null;
    const pt = e.target.getRelativePointerPosition();
    if (pt) strokeTo(pt.x, pt.y);
  };
  const move = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!painting || !drawing.current) return;
    const pt = e.target.getRelativePointerPosition();
    if (pt) strokeTo(pt.x, pt.y);
  };
  const end = async () => {
    if (drawing.current && strokeBefore.current) {
      const after = await snapshotCanvas(canvas);
      recordPaint(layer.id, strokeBefore.current, after);
    }
    strokeBefore.current = null;
    drawing.current = false;
    last.current = null;
  };

  return (
    <KonvaImage
      ref={(n) => {
        ref.current = n;
        nodeRef(n);
      }}
      image={canvas}
      x={layer.t.x}
      y={layer.t.y}
      width={layer.t.width || doc.width}
      height={layer.t.height || doc.height}
      rotation={layer.t.rotation}
      scaleX={layer.t.scaleX}
      scaleY={layer.t.scaleY}
      opacity={layer.opacity}
      visible={layer.visible}
      globalCompositeOperation={layer.style.clipBelow ? "source-atop" : blendToGCO(layer.style.blend)}
      {...shadowProps(layer.style)}
      // Moving a paint layer is done via the content-fitted box proxy in
      // editor-stage (so the box hugs the pixels), not by dragging the full node.
      draggable={false}
      onMouseDown={start}
      onTouchStart={start}
      onMouseMove={move}
      onTouchMove={move}
      onMouseUp={end}
      onTouchEnd={end}
      onMouseLeave={end}
      onClick={() => tool === "move" && onSelect()}
      onTap={() => tool === "move" && onSelect()}
      onDragEnd={(e) => onChange({ t: { ...layer.t, x: e.target.x(), y: e.target.y() } })}
    />
  );
}
