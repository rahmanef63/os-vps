"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/features/image-editor/ui/slider";
import { useEditor } from "../../lib/store";
import type { Layer } from "../../lib/types";

// Live shape controls in the options bar (fill · stroke on/off + color + width).
export function ShapeOptions({ selected, update }: { selected: Layer; update: (id: string, patch: Partial<Layer>) => void }) {
  const { patchStroke } = useEditor();
  const stroke = selected.style?.stroke;
  return (
    <>
      <label className="flex items-center gap-1.5">
        <Label className="text-muted-foreground">Fill</Label>
        <Input type="color" value={selected.fillColor ?? "#3b82f6"} onChange={(e) => update(selected.id, { fillColor: e.target.value, fillType: "solid" })} className="h-7 w-9 p-1" />
      </label>
      <label className="flex items-center gap-1.5">
        <Label className="text-muted-foreground">Stroke</Label>
        <Input type="color" value={stroke?.color ?? "#000000"} onChange={(e) => patchStroke(selected.id, { color: e.target.value, enabled: true })} className="h-7 w-9 p-1" />
      </label>
      <div className="flex items-center gap-2">
        <Label className="text-muted-foreground">Width</Label>
        <Slider className="w-24" min={0} max={40} value={[stroke?.enabled ? stroke.width : 0]} onValueChange={([v]) => patchStroke(selected.id, { width: v, enabled: v > 0 })} />
        <span className="w-6 tabular-nums text-muted-foreground">{stroke?.enabled ? stroke.width : 0}</span>
      </div>
    </>
  );
}
