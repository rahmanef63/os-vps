"use client";

import { Play, Pause, SkipBack, SkipForward, Scissors, Copy, Trash2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { fmtFrame } from "../lib/mock-timeline";
import { useFrame } from "../lib/frame-store";

// Transport bar under the preview: clip ops, play/pause, time readout, zoom.
// The time readout subscribes to the external frame-store directly so playback
// tick re-renders are scoped to this leaf — the orchestrator stays static.
export function Transport({
  duration,
  fps,
  playing,
  zoom,
  hasSel,
  monitor,
  onSeek,
  onTogglePlay,
  onSplit,
  onDuplicate,
  onDelete,
  onZoom,
  onToggleMonitor,
}: {
  duration: number;
  fps: number;
  playing: boolean;
  zoom: number;
  hasSel: boolean;
  monitor: boolean;
  onSeek: (f: number) => void;
  onTogglePlay: () => void;
  onSplit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onZoom: (z: number) => void;
  onToggleMonitor: () => void;
}) {
  const frame = useFrame();
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-white/10 bg-black/35 px-4 py-2 text-white">
      <div className="flex items-center gap-1">
        <Tbtn label="Start" onClick={() => onSeek(0)}>
          <SkipBack className="size-3.5" />
        </Tbtn>
        <Tbtn label="Play / Pause (Space)" onClick={onTogglePlay} primary>
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Tbtn>
        <Tbtn label="End" onClick={() => onSeek(duration - 1)}>
          <SkipForward className="size-3.5" />
        </Tbtn>
      </div>
      <div className="flex items-center gap-1">
        <Tbtn label="Split (S)" onClick={onSplit}>
          <Scissors className="size-3.5" />
        </Tbtn>
        <Tbtn label="Duplicate" onClick={onDuplicate} disabled={!hasSel}>
          <Copy className="size-3.5" />
        </Tbtn>
        <Tbtn label="Delete (Del)" onClick={onDelete} disabled={!hasSel}>
          <Trash2 className="size-3.5" />
        </Tbtn>
      </div>

      <Tbtn label={monitor ? "Mute preview audio" : "Unmute preview audio"} onClick={onToggleMonitor}>
        {monitor ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5 text-white/50" />}
      </Tbtn>

      <span className="font-mono text-xs tabular-nums">{fmtFrame(frame, fps)}</span>
      <span className="font-mono text-[11px] text-white/40">f{Math.round(frame)}</span>

      <div className="ml-auto flex items-center gap-2 text-[11px] text-white/60">
        <span>Zoom</span>
        <Slider
          className="w-20"
          min={1.4}
          max={8}
          step={0.1}
          value={zoom}
          onChange={(e) => onZoom(Number(e.target.value))}
          aria-label="Timeline zoom"
        />
      </div>
    </div>
  );
}

function Tbtn({
  children,
  label,
  onClick,
  primary,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "size-8 rounded-lg bg-white/10 text-white hover:bg-white/20 hover:text-white",
        primary && "size-9",
      )}
    >
      {children}
    </Button>
  );
}
