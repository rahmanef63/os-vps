"use client";
// audit-allow-hex: --ve-* canvas palette fallbacks (editor-stage chrome, not theme UI)

import { useState } from "react";
import { Video, AudioLines, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type Clip,
  type Composition,
  type Track,
  type TrackKind,
  clipsForTrack,
  trackWidth,
} from "../lib/mock-timeline";
import { ClipBlock } from "./clip-block";
import { TrackHead } from "./track-head";
import { type ClipDragMode } from "../lib/use-clip-drag";
import { useFrame } from "../lib/frame-store";

const TH = 36;
const LABEL = 120;

export type DragState = { id: string; mode: ClipDragMode; startX: number; start: number; len: number };

// Playhead is isolated so the timeline's lanes/ticks/clip blocks do NOT
// re-render on every rAF tick — only this thin red line + caret do.
function Playhead({ zoom }: { zoom: number }) {
  const frame = useFrame();
  return (
    <div
      className="pointer-events-none absolute bottom-0 top-6 z-10 w-0.5 bg-[var(--ve-playhead,#ff3b30)]"
      style={{ left: LABEL + frame * zoom }}
    >
      <span className="absolute -left-1.5 -top-px h-2 w-3 rounded-b-sm bg-[var(--ve-playhead,#ff3b30)]" />
    </div>
  );
}

// Multi-track timeline: zoomable ruler, lanes with draggable clip blocks
// (move + edge-resize, cross-track drop), click-to-seek, and a red playhead.
export function Timeline({
  comp,
  zoom,
  selectedId,
  dropTrack,
  onSeek,
  onScrub,
  onSelect,
  onClipDrag,
  onAddTrack,
  onTrackPatch,
  onTrackMove,
}: {
  comp: Composition;
  zoom: number;
  selectedId: string | null;
  dropTrack: string | null;
  onSeek: (frame: number) => void;
  onScrub?: () => void;
  onSelect: (id: string | null) => void;
  onClipDrag: (e: React.PointerEvent, clip: Clip, mode: ClipDragMode) => void;
  onAddTrack: (kind: TrackKind) => void;
  onTrackPatch: (id: string, patch: Partial<Track>) => void;
  onTrackMove: (id: string, dir: -1 | 1) => void;
}) {
  const [addMenu, setAddMenu] = useState(false);
  const W = trackWidth(comp.duration, zoom);
  const step = zoom < 2.2 ? comp.fps * 2 : comp.fps;
  const ticks: number[] = [];
  for (let f = 0; f <= comp.duration; f += step) ticks.push(f);

  // Click OR drag to scrub the playhead. Pure client state (onSeek → setFrame);
  // no network. The move handler is rAF-coalesced so a fast drag fires at most
  // one seek per frame, keeping scrubbing light.
  const beginScrub = (e: React.PointerEvent, el: HTMLElement) => {
    onScrub?.();
    const seek = (clientX: number) => {
      const r = el.getBoundingClientRect();
      onSeek(Math.max(0, Math.min(comp.duration - 1, (clientX - r.left) / zoom)));
    };
    seek(e.clientX);
    let raf = 0;
    let x = e.clientX;
    const move = (ev: PointerEvent) => {
      x = ev.clientX;
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; seek(x); });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (raf) cancelAnimationFrame(raf);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className="relative h-full min-h-0 border-t border-border bg-card">
      <div className="absolute inset-0 overflow-auto">
        <div className="relative min-h-full" style={{ width: LABEL + W }}>
          <div className="sticky top-0 z-20 flex h-6 bg-card">
            <div className="sticky left-0 z-30 flex w-[120px] flex-none items-center justify-center border-b border-r border-border bg-card">
              <div className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAddMenu((m) => !m)}
                  className="flex h-[18px] items-center gap-1 rounded bg-secondary px-2 text-[10px] font-bold text-muted-foreground hover:bg-secondary hover:text-muted-foreground"
                >
                  <Plus className="size-2.5" /> Track
                </Button>
                {addMenu && (
                  <div className="absolute left-0 top-5 z-40 min-w-[104px] rounded-md border border-border bg-popover p-1 shadow-md" onMouseLeave={() => setAddMenu(false)}>
                    {(["video", "audio"] as TrackKind[]).map((k) => (
                      <Button
                        key={k}
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          onAddTrack(k);
                          setAddMenu(false);
                        }}
                        className="flex h-auto w-full items-center justify-start gap-1.5 rounded px-2 py-1 text-xs font-normal capitalize hover:bg-accent"
                      >
                        {k === "audio" ? <AudioLines className="size-3" /> : <Video className="size-3" />}
                        {k} track
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div
              className="relative cursor-ew-resize touch-none border-b border-border"
              style={{ width: W }}
              onPointerDown={(e) => beginScrub(e, e.currentTarget)}
            >
              {ticks.map((f) => (
                <span
                  key={f}
                  className="absolute top-0 h-full border-l border-border pl-1 font-mono text-[10px] tabular-nums text-muted-foreground"
                  style={{ left: f * zoom }}
                >
                  {(f / comp.fps).toFixed(0)}s
                </span>
              ))}
            </div>
          </div>

          {comp.tracks.map((track, ti) => (
            <div key={track.id} className="flex" style={{ height: TH }}>
              <TrackHead
                track={track}
                index={ti}
                count={comp.tracks.length}
                onTrackPatch={onTrackPatch}
                onTrackMove={onTrackMove}
              />
              <div
                data-track={track.id}
                data-kind={track.kind}
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget) {
                    onSelect(null);
                    beginScrub(e, e.currentTarget);
                  }
                }}
                className={cn(
                  "relative border-b border-border",
                  track.kind === "audio" && "bg-secondary/40",
                  dropTrack === track.id && "bg-primary/15 ring-2 ring-inset ring-primary",
                  (track.hide || track.mute) && "opacity-50",
                )}
                style={{ width: W }}
              >
                {clipsForTrack(comp.clips, track.id).map((clip) => (
                  <ClipBlock
                    key={clip.id}
                    clip={clip}
                    zoom={zoom}
                    selected={selectedId === clip.id}
                    locked={!!track.lock}
                    trackHeight={TH}
                    onSelect={onSelect}
                    onDragStart={onClipDrag}
                  />
                ))}
              </div>
            </div>
          ))}

          <Playhead zoom={zoom} />
        </div>
      </div>
    </div>
  );
}
