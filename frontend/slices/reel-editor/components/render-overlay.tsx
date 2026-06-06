"use client";

import { Clapperboard, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Render progress overlay. While rendering: live progress bar. When `done`,
// surfaces a Download .webm button (real blob URL) + Close. `pct` 0..100.
export function RenderOverlay({
  pct,
  done,
  duration,
  downloadUrl,
  onClose,
}: {
  pct: number;
  done: boolean;
  duration: number;
  downloadUrl?: string;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-80 rounded-2xl border border-border bg-card/95 p-6 shadow-2xl backdrop-blur">
        <div className="mb-3.5 flex items-center gap-2.5">
          <span className="grid size-5 place-items-center rounded bg-primary/90">
            <Clapperboard className="size-3 text-primary-foreground" />
          </span>
          <strong className="text-sm">{done ? "Render complete" : "Rendering composition…"}</strong>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[11px] text-muted-foreground">
          <span>
            {Math.round((pct / 100) * duration)} / {duration} frames
          </span>
          <span>{Math.round(pct)}%</span>
        </div>

        {done ? (
          <div className="mt-4 flex gap-2">
            <Button asChild size="sm" className="flex-1">
              <a href={downloadUrl} download="reel.webm">
                <Download className="size-3.5" /> Download .webm
              </a>
            </Button>
            <Button size="sm" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex justify-end">
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="size-3.5" /> Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
