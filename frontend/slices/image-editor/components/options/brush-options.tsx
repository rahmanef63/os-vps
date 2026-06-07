"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/features/image-editor/ui/slider";
import { useEditor } from "../../lib/store";

// Brush / eraser controls (color · size · opacity · hardness) for the options bar.
export function BrushOptions() {
  const { tool, brush, setBrush, fg, setFg, selected, maskEditId } = useEditor();
  const isBrush = tool === "brush";
  const canPaint = maskEditId != null || selected?.kind === "paint";

  return (
    <>
      {!canPaint && (
        <span className="rounded bg-warning/15 px-2 py-0.5 text-warning">
          Select a Pixel layer to paint
        </span>
      )}
      {isBrush && (
        <label className="flex items-center gap-2">
          <Label className="text-muted-foreground">Color</Label>
          <Input type="color" value={fg} onChange={(e) => setFg(e.target.value)} className="h-7 w-9 p-1" />
        </label>
      )}
      <div className="flex items-center gap-2">
        <Label className="text-muted-foreground">Size</Label>
        <Slider className="w-28" min={1} max={200} value={[brush.size]} onValueChange={([v]) => setBrush({ size: v })} />
        <span className="w-8 tabular-nums text-muted-foreground">{brush.size}</span>
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-muted-foreground">Opacity</Label>
        <Slider className="w-24" min={5} max={100} value={[Math.round(brush.opacity * 100)]} onValueChange={([v]) => setBrush({ opacity: v / 100 })} />
        <span className="w-9 tabular-nums text-muted-foreground">{Math.round(brush.opacity * 100)}%</span>
      </div>
      {isBrush && (
        <div className="flex items-center gap-2">
          <Label className="text-muted-foreground">Hardness</Label>
          <Slider className="w-24" min={0} max={100} value={[Math.round(brush.hardness * 100)]} onValueChange={([v]) => setBrush({ hardness: v / 100 })} />
          <span className="w-9 tabular-nums text-muted-foreground">{Math.round(brush.hardness * 100)}%</span>
        </div>
      )}
    </>
  );
}
