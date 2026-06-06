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
import { FONT_FAMILIES } from "../../lib/model";
import type { Layer } from "../../lib/types";

// Live text controls in the options bar (Photoshop pattern: font/size/style/fill
// while the Text layer is selected) — the same fields as the Properties panel.
export function TextOptions({ selected, update }: { selected: Layer; update: (id: string, patch: Partial<Layer>) => void }) {
  const id = selected.id;
  const style = selected.fontStyle ?? "normal";
  const bold = style.includes("bold");
  const italic = style.includes("italic");
  const compose = (b: boolean, i: boolean) => [b ? "bold" : "", i ? "italic" : ""].filter(Boolean).join(" ") || "normal";

  return (
    <>
      <Select value={selected.fontFamily} onValueChange={(v) => update(id, { fontFamily: v })}>
        <SelectTrigger className="h-7 w-36"><SelectValue placeholder="Font" /></SelectTrigger>
        <SelectContent>
          {FONT_FAMILIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-1.5">
        <Label className="text-muted-foreground">Size</Label>
        <Input type="number" value={selected.fontSize ?? 64} onChange={(e) => update(id, { fontSize: Number(e.target.value) || 0 })} className="h-7 w-16" />
      </div>
      <Button variant={bold ? "default" : "outline"} size="icon" className="size-7" onClick={() => update(id, { fontStyle: compose(!bold, italic) })} aria-label="Bold"><Bold className="size-3.5" /></Button>
      <Button variant={italic ? "default" : "outline"} size="icon" className="size-7" onClick={() => update(id, { fontStyle: compose(bold, !italic) })} aria-label="Italic"><Italic className="size-3.5" /></Button>
      <label className="flex items-center gap-1.5">
        <Label className="text-muted-foreground">Fill</Label>
        <Input type="color" value={selected.fill ?? "#ffffff"} onChange={(e) => update(id, { fill: e.target.value })} className="h-7 w-9 p-1" />
      </label>
    </>
  );
}
