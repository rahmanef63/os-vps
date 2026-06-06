"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { type Adjust, type Clip } from "../lib/mock-timeline";
import { hasAdjust } from "../lib/draw-adjust";
import { Header } from "./clip-ui";

type Row = { k: keyof Adjust; label: string; min: number; max: number; track?: string };

const ROWS: Row[] = [
  { k: "exposure", label: "Exposure", min: -100, max: 100 },
  { k: "contrast", label: "Contrast", min: -100, max: 100 },
  { k: "saturation", label: "Saturation", min: -100, max: 100, track: "linear-gradient(90deg,#888,#f33)" },
  { k: "temp", label: "Temperature", min: -100, max: 100, track: "linear-gradient(90deg,#3b82f6,#e5e5e5,#f59e0b)" },
  { k: "fade", label: "Fade", min: 0, max: 100 },
  { k: "vignette", label: "Vignette", min: 0, max: 100 },
];

// Adjust tab: per-clip color grading. Values bake into preview AND export via
// the shared draw path (canvas filter + vignette overlay).
export function ClipTabAdjust({ clip, onChange }: { clip: Clip; onChange: (patch: Partial<Clip>) => void }) {
  const a = clip.adjust ?? {};
  const set = (k: keyof Adjust, v: number) => onChange({ adjust: { ...a, [k]: v } });

  return (
    <>
      <Header
        right={
          hasAdjust(a) ? (
            <Button
              type="button"
              variant="ghost"
              title="Reset all"
              onClick={() => onChange({ adjust: undefined })}
              className="flex h-5 items-center gap-1 rounded bg-secondary px-1.5 text-[10px] font-normal text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <RotateCcw className="size-2.5" /> Reset
            </Button>
          ) : undefined
        }
      >
        Adjust
      </Header>
      {ROWS.map((r) => {
        const v = a[r.k] ?? 0;
        return (
          <div key={r.k}>
            <div className="mb-1 flex items-center gap-1.5">
              <span className="flex-1 text-[11px] font-semibold text-muted-foreground">{r.label}</span>
              {v !== 0 && (
                <Button type="button" variant="ghost" title="Reset" onClick={() => set(r.k, 0)} className="h-auto gap-0 rounded-none p-0 font-normal text-muted-foreground hover:bg-transparent hover:text-foreground">
                  <RotateCcw className="size-2.5" />
                </Button>
              )}
              <span className="min-w-8 text-right text-[11px] tabular-nums text-muted-foreground">{v}</span>
            </div>
            <Slider
              min={r.min}
              max={r.max}
              value={v}
              onChange={(e) => set(r.k, Number(e.target.value))}
              style={r.track ? { background: r.track, borderRadius: 999 } : undefined}
            />
          </div>
        );
      })}
    </>
  );
}
