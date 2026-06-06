"use client";

import { Minus, Plus, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";

// Hoisted out of ZoomHud so it isn't re-created every render (react-hooks/static-components).
const Btn = ({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) => (
  <Button type="button" variant="ghost" aria-label={label} onClick={onClick} className="grid size-7 place-items-center rounded-md p-0 font-normal text-muted-foreground hover:bg-accent hover:text-foreground">
    {children}
  </Button>
);

// Floating zoom control (bottom-left of the canvas): −, current %, +, fit.
export function ZoomHud({
  zoom,
  onOut,
  onIn,
  onReset,
  onFit,
}: {
  zoom: number;
  onOut: () => void;
  onIn: () => void;
  onReset: () => void;
  onFit: () => void;
}) {
  return (
    <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-lg border border-border bg-card/90 px-1 py-0.5 shadow-sm backdrop-blur">
      <Btn label="Zoom out" onClick={onOut}><Minus className="size-4" /></Btn>
      <Button type="button" variant="ghost" onClick={onReset} className="h-auto w-12 rounded px-1 py-0.5 text-center text-xs font-normal tabular-nums text-muted-foreground hover:bg-transparent hover:text-foreground">
        {Math.round(zoom * 100)}%
      </Button>
      <Btn label="Zoom in" onClick={onIn}><Plus className="size-4" /></Btn>
      <Btn label="Fit to screen" onClick={onFit}><Maximize className="size-4" /></Btn>
    </div>
  );
}
