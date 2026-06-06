"use client";

import { useEditor } from "../lib/store";
import { BrushOptions } from "./options/brush-options";
import { TextOptions } from "./options/text-options";
import { ShapeOptions } from "./options/shape-options";
import { AlignOptions } from "./options/align-options";

const TOOL_LABEL: Record<string, string> = {
  move: "Move", brush: "Brush", eraser: "Eraser", text: "Text", rect: "Rectangle",
  ellipse: "Ellipse", eyedropper: "Eyedropper", crop: "Crop", select: "Select", hand: "Pan",
};

// Always-present contextual options bar (Photoshop pattern): its controls follow
// the active tool + selection — paint settings for brush/eraser, font/size for a
// text layer, fill/stroke for a shape, align for an image — and it shows the doc
// size + zoom on the right when nothing else applies. Staying mounted (fixed
// height) avoids the canvas jumping when you switch tools.
export function ToolOptionsBar() {
  const { tool, selected, update, zoom, maskEditId } = useEditor();
  const painting = tool === "brush" || tool === "eraser" || maskEditId != null;

  const ctx = painting ? (
    <BrushOptions />
  ) : selected?.kind === "text" ? (
    <TextOptions selected={selected} update={update} />
  ) : selected?.kind === "shape" ? (
    <ShapeOptions selected={selected} update={update} />
  ) : tool === "crop" ? (
    <span className="text-muted-foreground">Drag on the canvas to set the crop, then press Enter.</span>
  ) : selected?.kind === "image" ? (
    <AlignOptions selected={selected} />
  ) : (
    <span className="text-muted-foreground">{selected ? selected.name : "No selection"}</span>
  );

  return (
    <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-card/60 px-3 text-xs">
      <span className="font-medium text-foreground">{TOOL_LABEL[tool] ?? tool}</span>
      <span className="h-4 w-px bg-border" />
      <div className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto">{ctx}</div>
      <span className="shrink-0 tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
    </div>
  );
}
