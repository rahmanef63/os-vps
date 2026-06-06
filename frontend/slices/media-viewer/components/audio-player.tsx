"use client";

import { Music } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Sample } from "../lib/samples";
import { usePlayback } from "../lib/use-playback";
import { TransportBar } from "./transport";

const BARS = 72;

// Deterministic pseudo-waveform heights (0.15..1), stable across renders.
const HEIGHTS = Array.from({ length: BARS }, (_, i) => {
  const v = Math.abs(Math.sin(i * 0.5) * Math.cos(i * 0.23));
  return 0.15 + v * 0.85;
});

export function AudioPlayer({ file }: { file: Sample }) {
  const duration = file.duration ?? 42;
  const { playing, pos, toggle, seek } = usePlayback(duration);

  return (
    <div className="flex w-full max-w-lg flex-col gap-5 rounded-2xl border bg-card/80 p-6 shadow-2xl backdrop-blur">
      <div className="flex items-center gap-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
          <Music className="size-7" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-base font-semibold">{file.name}</div>
          <div className="text-xs text-muted-foreground">{file.meta ?? "Audio"}</div>
        </div>
      </div>

      <Waveform pos={pos} />

      <TransportBar
        playing={playing}
        pos={pos}
        duration={duration}
        onToggle={toggle}
        onSeek={seek}
      />
    </div>
  );
}

// CSS-bar waveform. Bars before the playhead read as accent, the rest muted.
// Clicking a bar seeks to that fraction.
function Waveform({ pos }: { pos: number }) {
  return (
    <div className="flex h-14 items-center gap-[2px]">
      {HEIGHTS.map((h, i) => {
        const on = i / BARS <= pos;
        return (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-full transition-colors",
              on ? "bg-[var(--accent)]" : "bg-border",
            )}
            style={{ height: `${Math.round(h * 100)}%` }}
          />
        );
      })}
    </div>
  );
}
