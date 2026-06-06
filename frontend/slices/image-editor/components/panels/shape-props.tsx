"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/features/image-editor/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { Layer } from "../../lib/types";

// Shape-layer extras for the transform panel (shape kind + fill color).
export function ShapeProps({
  selected,
  update,
}: {
  selected: Layer;
  update: (id: string, patch: Partial<Layer>) => void;
}) {
  const id = selected.id;
  const grad = selected.fillType === "gradient";
  const g = selected.gradient ?? { from: selected.fillColor ?? "#3b82f6", to: "#9333ea", angle: 90 };
  return (
    <>
      <Separator />
      <Label className="text-xs text-muted-foreground">Shape</Label>
      <Select value={selected.shape} onValueChange={(v) => update(id, { shape: v as Layer["shape"] })}>
        <SelectTrigger>
          <SelectValue placeholder="Shape" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="rect">Rectangle</SelectItem>
          <SelectItem value="ellipse">Ellipse</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Gradient fill</Label>
        <Switch checked={grad} onCheckedChange={(c) => update(id, { fillType: c ? "gradient" : "solid", gradient: c ? g : selected.gradient })} />
      </div>
      {grad ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="color" value={g.from} onChange={(e) => update(id, { gradient: { ...g, from: e.target.value } })} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="color" value={g.to} onChange={(e) => update(id, { gradient: { ...g, to: e.target.value } })} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Angle {g.angle}°</Label>
            <Slider min={0} max={360} value={[g.angle]} onValueChange={([v]) => update(id, { gradient: { ...g, angle: v } })} />
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Fill</Label>
          <Input type="color" value={selected.fillColor ?? "#3b82f6"} onChange={(e) => update(id, { fillColor: e.target.value })} />
        </div>
      )}
    </>
  );
}
