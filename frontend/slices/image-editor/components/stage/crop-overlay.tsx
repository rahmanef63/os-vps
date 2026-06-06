"use client";

import { useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Doc, Pan } from "../../lib/types";

type Box = { x: number; y: number; w: number; h: number };
type Handle = "move" | "nw" | "ne" | "sw" | "se";

// DOM crop overlay (no extra Konva transformer). The box is in DOC coordinates,
// drawn over the canvas via pan+zoom. Drag the body to move, corners to resize;
// Apply commits via onApply (the store re-bakes paint pixels + resizes the doc).
export function CropOverlay({
  doc,
  zoom,
  pan,
  onApply,
  onCancel,
}: {
  doc: Doc;
  zoom: number;
  pan: Pan;
  onApply: (x: number, y: number, w: number, h: number) => void;
  onCancel: () => void;
}) {
  const [box, setBox] = useState<Box>({ x: 0, y: 0, w: doc.width, h: doc.height });
  const drag = useRef<{ h: Handle; px: number; py: number; b: Box } | null>(null);

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
    w = Math.max(16, w); h = Math.max(16, h);
    x = Math.max(0, Math.min(x, doc.width - 16));
    y = Math.max(0, Math.min(y, doc.height - 16));
    w = Math.min(w, doc.width - x);
    h = Math.min(h, doc.height - y);
    setBox({ x, y, w, h });
  };
  const end = () => (drag.current = null);

  const px = { left: pan.x + box.x * zoom, top: pan.y + box.y * zoom, width: box.w * zoom, height: box.h * zoom };
  const corner = "absolute size-3 rounded-sm border border-white bg-primary";

  return (
    <div className="absolute inset-0 z-20" onPointerMove={move} onPointerUp={end}>
      <div className="absolute border-2 border-dashed border-primary bg-primary/5" style={px} onPointerDown={(e) => start("move", e)}>
        <span className={cn(corner, "-left-1.5 -top-1.5 cursor-nwse-resize")} onPointerDown={(e) => start("nw", e)} />
        <span className={cn(corner, "-right-1.5 -top-1.5 cursor-nesw-resize")} onPointerDown={(e) => start("ne", e)} />
        <span className={cn(corner, "-bottom-1.5 -left-1.5 cursor-nesw-resize")} onPointerDown={(e) => start("sw", e)} />
        <span className={cn(corner, "-bottom-1.5 -right-1.5 cursor-nwse-resize")} onPointerDown={(e) => start("se", e)} />
      </div>
      <div className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-border bg-card/95 px-2 py-1 text-xs shadow-sm">
        <span className="tabular-nums text-muted-foreground">{Math.round(box.w)}×{Math.round(box.h)}</span>
        <Button type="button" variant="ghost" onClick={() => onApply(box.x, box.y, box.w, box.h)} className="flex h-auto items-center gap-1 rounded bg-primary px-2 py-0.5 font-normal text-primary-foreground hover:bg-primary">
          <Check className="size-3" /> Apply
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} className="flex h-auto items-center gap-1 rounded px-2 py-0.5 font-normal text-muted-foreground hover:bg-accent">
          <X className="size-3" /> Cancel
        </Button>
      </div>
    </div>
  );
}
