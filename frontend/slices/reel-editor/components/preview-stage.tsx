"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { type Composition } from "../lib/mock-timeline";
import type { MediaCache } from "../lib/media-cache";
import { drawFrame } from "../lib/draw";
import { useFrame } from "../lib/frame-store";

// Real-time preview. A single <canvas> at the comp's native resolution is the
// SAME draw path the exporter uses (drawFrame), so the preview is a faithful
// proof of the render. Real videos are kept in sync with the playhead via the
// shared MediaCache; CSS scales the fixed-resolution canvas into the stage box.
// Subscribes to the external frame-store directly so the orchestrator slice
// doesn't re-render on every playback tick — only this canvas does.
export function PreviewStage({
  comp,
  playing,
  monitor,
  cache,
  align = "center",
}: {
  comp: Composition;
  playing: boolean;
  monitor: boolean;
  cache: MediaCache;
  align?: "center" | "left";
}) {
  const frame = useFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tick, setTick] = useState(0);
  const portrait = comp.h > comp.w;

  // Redraw whenever a tracked media element decodes a new frame (load/seek).
  useEffect(() => cache.onFrame(() => setTick((t) => t + 1)), [cache]);

  // Draw on every playhead/comp/playstate change (and media-frame tick).
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    cache.ensure(comp);
    cache.syncPlayback(comp, frame, playing, monitor);
    drawFrame(ctx, comp, frame, cache);
  }, [comp, frame, playing, monitor, tick, cache]);

  const hasActive = comp.clips.some(
    (c) => c.kind !== "audio" && frame >= c.start && frame < c.start + c.len,
  );

  return (
    <div className={cn("grid min-h-0 flex-1 items-center p-4", align === "left" ? "justify-items-start" : "justify-items-center")}>
      <div
        className="relative overflow-hidden rounded-lg bg-black shadow-2xl"
        style={
          portrait
            ? { height: "100%", aspectRatio: `${comp.w}/${comp.h}`, maxWidth: "100%" }
            : { width: "100%", aspectRatio: `${comp.w}/${comp.h}`, maxHeight: "100%", maxWidth: "42rem" }
        }
      >
        <canvas
          ref={canvasRef}
          width={comp.w}
          height={comp.h}
          className="absolute inset-0 h-full w-full"
        />
        {!hasActive && (
          <div className="absolute inset-0 grid place-items-center text-sm text-white/30">
            No clip at playhead
          </div>
        )}
      </div>
    </div>
  );
}
