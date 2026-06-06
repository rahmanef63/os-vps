"use client";

import { Volume2, Film } from "lucide-react";
import type { Sample } from "../lib/samples";
import { usePlayback } from "../lib/use-playback";
import { PlayButton, TransportBar } from "./transport";

export function VideoPlayer({ file }: { file: Sample }) {
  const duration = file.duration ?? 24;
  const { playing, pos, toggle, seek } = usePlayback(duration);

  return (
    <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-xl shadow-2xl">
      {/* Stage — tinted gradient + striped placeholder (no real bytes). */}
      <div className="relative aspect-video bg-[linear-gradient(135deg,#2a2f6b,#ff7ac4)]">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.08)_0_14px,transparent_14px_28px)]" />
        <div className="absolute bottom-3 left-4 flex items-center gap-2 font-mono text-xs text-white/85">
          <Film className="size-4" />
          {file.name}
        </div>
        <div className="absolute inset-0 grid place-items-center">
          <PlayButton playing={playing} onToggle={toggle} big />
        </div>
      </div>

      {/* Transport bar over a scrim. */}
      <div className="bg-background/80 px-3 py-2 text-foreground backdrop-blur">
        <TransportBar
          playing={playing}
          pos={pos}
          duration={duration}
          onToggle={toggle}
          onSeek={seek}
        >
          <Volume2 className="size-4 shrink-0 text-muted-foreground" />
        </TransportBar>
      </div>
    </div>
  );
}
