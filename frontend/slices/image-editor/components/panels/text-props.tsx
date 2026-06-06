"use client";

import { Bold, Italic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FONT_FAMILIES } from "../../lib/model";
import type { Layer } from "../../lib/types";

// Text-layer extras for the transform panel (content / size / fill / font /
// bold+italic). Split out of transform-panel to keep each file ≤200 LOC.
export function TextProps({
  selected,
  update,
}: {
  selected: Layer;
  update: (id: string, patch: Partial<Layer>) => void;
}) {
  const id = selected.id;
  const style = selected.fontStyle ?? "normal";
  const bold = style.includes("bold");
  const italic = style.includes("italic");
  const compose = (b: boolean, i: boolean) =>
    [b ? "bold" : "", i ? "italic" : ""].filter(Boolean).join(" ") || "normal";

  return (
    <>
      <Separator />
      <Label className="text-xs text-muted-foreground">Text</Label>
      <Input value={selected.text ?? ""} onChange={(e) => update(id, { text: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Size</Label>
          <Input type="number" value={selected.fontSize ?? 64} onChange={(e) => update(id, { fontSize: Number(e.target.value) || 0 })} />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Fill</Label>
          <Input type="color" value={selected.fill ?? "#ffffff"} onChange={(e) => update(id, { fill: e.target.value })} />
        </div>
      </div>
      <Select value={selected.fontFamily} onValueChange={(v) => update(id, { fontFamily: v })}>
        <SelectTrigger>
          <SelectValue placeholder="Font" />
        </SelectTrigger>
        <SelectContent>
          {FONT_FAMILIES.map((f) => (
            <SelectItem key={f} value={f}>
              {f}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-2">
        <Button variant={bold ? "default" : "outline"} size="sm" className="flex-1" onClick={() => update(id, { fontStyle: compose(!bold, italic) })}>
          <Bold className="size-4" />
        </Button>
        <Button variant={italic ? "default" : "outline"} size="sm" className="flex-1" onClick={() => update(id, { fontStyle: compose(bold, !italic) })}>
          <Italic className="size-4" />
        </Button>
      </div>
    </>
  );
}
