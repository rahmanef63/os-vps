"use client";

import { Slider } from "@/features/image-editor/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useEditor } from "../../lib/store";
import { BLEND_MODES, type BlendMode } from "../../lib/types";

// Photoshop-style Layers header: blend mode + opacity for the SELECTED layer,
// sitting at the top of the panel container (not per-row) so rows stay compact.
export function LayersHeader() {
  const { selected, update, patchStyle } = useEditor();
  const disabled = !selected;

  return (
    <div className={cn("flex shrink-0 items-center gap-2 border-b border-border px-2 py-1.5", disabled && "opacity-50")}>
      <Select
        value={selected?.style.blend ?? "normal"}
        onValueChange={(v) => selected && patchStyle(selected.id, { blend: v as BlendMode })}
        disabled={disabled}
      >
        <SelectTrigger className="h-7 w-28 text-xs capitalize">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BLEND_MODES.map((b) => (
            <SelectItem key={b} value={b} className="text-xs capitalize">
              {b}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex flex-1 items-center gap-2">
        <Slider
          min={0}
          max={100}
          value={[Math.round((selected?.opacity ?? 1) * 100)]}
          onValueChange={([v]) => selected && update(selected.id, { opacity: v / 100 })}
          disabled={disabled}
          className="flex-1"
        />
        <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
          {Math.round((selected?.opacity ?? 1) * 100)}%
        </span>
      </div>
    </div>
  );
}
