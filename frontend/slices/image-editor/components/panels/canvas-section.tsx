"use client";

import { useState } from "react";
import { Link2, Link2Off } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ASPECT_PRESETS } from "../../lib/model";
import { useEditor } from "../../lib/store";

const num = (v: string) => Math.max(1, Math.round(Number(v) || 0));

// Document (canvas) controls — shown when nothing is selected. Aspect preset
// reflects the current ratio, W/H support an aspect-ratio LOCK (chain) so resizing
// one keeps proportions, and a compact summary replaces the old verbose hint.
export function CanvasSection() {
  const { doc, setDocSize } = useEditor();
  const [locked, setLocked] = useState(false);
  const ratio = doc.width / doc.height;

  // Match the current size to a known preset so the dropdown shows it.
  const current = ASPECT_PRESETS.find((p) => p.w === doc.width && p.h === doc.height)?.label;

  const setW = (w: number) => setDocSize(w, locked ? Math.max(1, Math.round(w / ratio)) : doc.height);
  const setH = (h: number) => setDocSize(locked ? Math.max(1, Math.round(h * ratio)) : doc.width, h);

  return (
    <section className="flex flex-col gap-3">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Canvas</Label>
      <Select value={current} onValueChange={(v) => { const p = ASPECT_PRESETS.find((x) => x.label === v); if (p) setDocSize(p.w, p.h); }}>
        <SelectTrigger><SelectValue placeholder="Aspect preset" /></SelectTrigger>
        <SelectContent>{ASPECT_PRESETS.map((p) => <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>)}</SelectContent>
      </Select>
      <div className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <Label className="text-xs text-muted-foreground">W</Label>
          <Input type="number" value={doc.width} onChange={(e) => setW(num(e.target.value))} />
        </div>
        <Button
          type="button"
          variant="ghost"
          aria-label={locked ? "Unlock aspect ratio" : "Lock aspect ratio"}
          aria-pressed={locked}
          onClick={() => setLocked((v) => !v)}
          className={cn(
            "mb-1 grid size-8 shrink-0 place-items-center rounded-md border border-border p-0 font-normal transition-colors hover:bg-transparent",
            locked ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
          )}
        >
          {locked ? <Link2 className="size-4" /> : <Link2Off className="size-4" />}
        </Button>
        <div className="flex flex-1 flex-col gap-1">
          <Label className="text-xs text-muted-foreground">H</Label>
          <Input type="number" value={doc.height} onChange={(e) => setH(num(e.target.value))} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{doc.width} × {doc.height} px · pick a layer to edit it.</p>
    </section>
  );
}
