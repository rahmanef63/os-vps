"use client";

import { useRef, useState } from "react";
import { Eraser, PaintBucket, Crop, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEditor } from "../../lib/store";
import { snapshotCanvas } from "../../lib/snapshot";

type Box = { x: number; y: number; w: number; h: number };
type Handle = "move" | "nw" | "ne" | "sw" | "se";

// Rectangular marquee selection (same drag/resize pattern as crop-overlay). Acts
// on the active PAINT layer: Clear erases the region, Fill paints it with the
// brush colour, Crop crops the doc to it. Region ops are deterministic pixel
// writes on the layer's offscreen canvas + an undoable recordPaint snapshot.
export function SelectionOverlay({ onDone }: { onDone: () => void }) {
  const { doc, zoom, pan, selected, canvasFor, recordPaint, brush, applyCrop, stageRef } = useEditor();
  const [box, setBox] = useState<Box>({ x: doc.width * 0.2, y: doc.height * 0.2, w: doc.width * 0.6, h: doc.height * 0.6 });
  const drag = useRef<{ h: Handle; px: number; py: number; b: Box } | null>(null);
  const paint = selected?.kind === "paint" ? selected : null;

  // Un-curried (h, e) signature: a curried start(h) call in JSX executes during
  // render, which react-hooks/refs reads as a render-time ref write.
  const start = (h: Handle, e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { h, px: e.clientX, py: e.clientY, b: box };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.px) / zoom;
    const dy = (e.clientY - d.py) / zoom;
    let { x, y, w, h } = d.b;
    if (d.h === "move") { x += dx; y += dy; }
    if (d.h === "nw") { x += dx; y += dy; w -= dx; h -= dy; }
    if (d.h === "ne") { y += dy; w += dx; h -= dy; }
    if (d.h === "sw") { x += dx; w -= dx; h += dy; }
    if (d.h === "se") { w += dx; h += dy; }
    w = Math.max(8, w); h = Math.max(8, h);
    x = Math.max(0, Math.min(x, doc.width - 8)); y = Math.max(0, Math.min(y, doc.height - 8));
    setBox({ x, y, w: Math.min(w, doc.width - x), h: Math.min(h, doc.height - y) });
  };
  const end = () => (drag.current = null);

  const regionOp = async (op: (ctx: CanvasRenderingContext2D) => void) => {
    if (!paint) return;
    const c = canvasFor(paint.id, doc.width, doc.height);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const before = await snapshotCanvas(c);
    ctx.save();
    op(ctx);
    ctx.restore();
    stageRef.current?.draw();
    const after = await snapshotCanvas(c);
    recordPaint(paint.id, before, after);
  };
  const clear = () => regionOp((ctx) => ctx.clearRect(box.x, box.y, box.w, box.h));
  const fill = () => regionOp((ctx) => { ctx.fillStyle = brush.color; ctx.fillRect(box.x, box.y, box.w, box.h); });

  const sx = { left: pan.x + box.x * zoom, top: pan.y + box.y * zoom, width: box.w * zoom, height: box.h * zoom };
  const corner = "absolute size-3 rounded-sm border border-white bg-primary";
  const btn = "flex h-auto items-center gap-1 rounded px-2 py-0.5 font-normal hover:bg-transparent";

  return (
    <div className="absolute inset-0 z-20" onPointerMove={move} onPointerUp={end}>
      <div className="absolute border-2 border-dashed border-primary bg-primary/5" style={sx} onPointerDown={(e) => start("move", e)}>
        <span className={cn(corner, "-left-1.5 -top-1.5 cursor-nwse-resize")} onPointerDown={(e) => start("nw", e)} />
        <span className={cn(corner, "-right-1.5 -top-1.5 cursor-nesw-resize")} onPointerDown={(e) => start("ne", e)} />
        <span className={cn(corner, "-bottom-1.5 -left-1.5 cursor-nesw-resize")} onPointerDown={(e) => start("sw", e)} />
        <span className={cn(corner, "-bottom-1.5 -right-1.5 cursor-nwse-resize")} onPointerDown={(e) => start("se", e)} />
      </div>
      <div className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-border bg-card/95 px-2 py-1 text-xs shadow-sm">
        <Button type="button" variant="ghost" disabled={!paint} onClick={clear} className={cn(btn, "text-foreground hover:bg-accent disabled:opacity-40")}>
          <Eraser className="size-3" /> Clear
        </Button>
        <Button type="button" variant="ghost" disabled={!paint} onClick={fill} className={cn(btn, "text-foreground hover:bg-accent disabled:opacity-40")}>
          <PaintBucket className="size-3" /> Fill
        </Button>
        <Button type="button" variant="ghost" onClick={() => { applyCrop(box.x, box.y, box.w, box.h); onDone(); }} className={cn(btn, "text-foreground hover:bg-accent")}>
          <Crop className="size-3" /> Crop
        </Button>
        <Button type="button" variant="ghost" onClick={onDone} className={cn(btn, "text-muted-foreground hover:bg-accent")}>
          <X className="size-3" /> Done
        </Button>
      </div>
    </div>
  );
}
