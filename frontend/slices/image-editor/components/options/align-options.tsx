"use client";

import {
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useEditor } from "../../lib/store";
import type { Layer } from "../../lib/types";

// Align the selected layer to the canvas (Photoshop "Move tool" options bar).
export function AlignOptions({ selected }: { selected: Layer }) {
  const { doc, update } = useEditor();
  const t = selected.t;
  const set = (patch: Partial<Layer["t"]>) => update(selected.id, { t: { ...t, ...patch } });
  const aligns = [
    { icon: AlignHorizontalJustifyStart, label: "Left", run: () => set({ x: 0 }) },
    { icon: AlignHorizontalJustifyCenter, label: "Center", run: () => set({ x: Math.round((doc.width - t.width) / 2) }) },
    { icon: AlignHorizontalJustifyEnd, label: "Right", run: () => set({ x: doc.width - t.width }) },
    { icon: AlignVerticalJustifyStart, label: "Top", run: () => set({ y: 0 }) },
    { icon: AlignVerticalJustifyCenter, label: "Middle", run: () => set({ y: Math.round((doc.height - t.height) / 2) }) },
    { icon: AlignVerticalJustifyEnd, label: "Bottom", run: () => set({ y: doc.height - t.height }) },
  ];
  return (
    <>
      <Label className="text-muted-foreground">Align to canvas</Label>
      {aligns.map((a) => (
        <Button key={a.label} variant="ghost" size="icon" className="size-7" onClick={a.run} aria-label={a.label} title={a.label}>
          <a.icon className="size-4" />
        </Button>
      ))}
    </>
  );
}
