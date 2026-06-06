"use client";

import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { fmtTime } from "../lib/media";

// Round play/pause control. `big` is the centered overlay variant.
export function PlayButton({
  playing,
  onToggle,
  big,
}: {
  playing: boolean;
  onToggle: () => void;
  big?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onToggle}
      aria-label={playing ? "Pause" : "Play"}
      className={cn(
        "shrink-0 rounded-full p-0 text-foreground backdrop-blur",
        big
          ? "size-16 bg-background/40 hover:bg-background/60"
          : "size-8 bg-foreground/10 hover:bg-foreground/20",
      )}
    >
      {playing ? (
        <Pause className={big ? "size-7" : "size-4"} />
      ) : (
        <Play className={cn(big ? "size-7" : "size-4", !big && "translate-x-px")} />
      )}
    </Button>
  );
}

// Play/pause · current time · scrubber · total time row. `pos` is 0..1.
export function TransportBar({
  playing,
  pos,
  duration,
  onToggle,
  onSeek,
  children,
}: {
  playing: boolean;
  pos: number;
  duration: number;
  onToggle: () => void;
  onSeek: (pos: number) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <PlayButton playing={playing} onToggle={onToggle} />
      <span className="font-mono text-xs tabular-nums">
        {fmtTime(pos * duration)}
      </span>
      <Slider
        min={0}
        max={1000}
        value={Math.round(pos * 1000)}
        onChange={(e) => onSeek(Number(e.currentTarget.value) / 1000)}
        aria-label="Seek"
        className="flex-1"
      />
      <span className="font-mono text-xs tabular-nums text-muted-foreground">
        {fmtTime(duration)}
      </span>
      {children}
    </div>
  );
}
