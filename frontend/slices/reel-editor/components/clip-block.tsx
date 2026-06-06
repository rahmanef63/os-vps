"use client";

import { cn } from "@/lib/utils";
import { type Clip } from "../lib/mock-timeline";
import { useWaveform } from "../lib/waveform";
import { useThumbs } from "../lib/thumbs";
import { type ClipDragMode } from "../lib/use-clip-drag";

const EDGE_PX = 9;

// A single clip block on a lane. Drag the body to move, drag the right edge to
// resize. While dragging across lanes the parent tracks the hovered track.
// Visual media clips render a filmstrip of source thumbnails behind the label.
export function ClipBlock({
  clip,
  zoom,
  selected,
  locked = false,
  trackHeight,
  onSelect,
  onDragStart,
}: {
  clip: Clip;
  zoom: number;
  selected: boolean;
  locked?: boolean;
  trackHeight: number;
  onSelect: (id: string) => void;
  onDragStart: (e: React.PointerEvent, clip: Clip, mode: ClipDragMode) => void;
}) {
  const trimmable = !!clip.media && clip.media.type !== "image";
  const visualMedia = clip.media && clip.media.type !== "audio" ? clip.media : null;
  const thumbs = useThumbs(visualMedia?.url, visualMedia?.type as "image" | "video" | undefined);
  return (
    <div
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect(clip.id);
        if (e.button !== 0 || locked) return;
        const localX = e.clientX - e.currentTarget.getBoundingClientRect().left;
        const w = clip.len * zoom;
        const mode: ClipDragMode =
          localX > w - EDGE_PX ? "resize" : trimmable && localX < EDGE_PX ? "trim-in" : "move";
        onDragStart(e, clip, mode);
      }}
      className={cn(
        "absolute flex items-center overflow-hidden rounded-md px-2 text-[11px] font-semibold text-white",
        selected ? "ring-2 ring-foreground" : "shadow-sm",
      )}
      style={{
        left: clip.start * zoom + 1,
        width: clip.len * zoom - 2,
        top: 4,
        height: trackHeight - 8,
        background: clip.color,
        cursor: locked ? "not-allowed" : "grab",
      }}
    >
      {thumbs && (
        <span className="pointer-events-none absolute inset-0 flex">
          {Array.from({ length: Math.max(thumbs.length, Math.ceil((clip.len * zoom) / 56)) }).map((_, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={thumbs[i % thumbs.length]} alt="" className="h-full w-14 flex-none object-cover" draggable={false} />
          ))}
          <span className="absolute inset-0 bg-black/25" />
        </span>
      )}
      {clip.kind === "audio" ? (
        <Waveform url={clip.media?.url} />
      ) : (
        <span className="relative truncate drop-shadow">{clip.text ?? clip.name}</span>
      )}
      {trimmable && (
        <span className="absolute inset-y-1 left-0 w-1 rounded-l bg-white/60" title="Trim start" />
      )}
      <span className="absolute inset-y-0 right-0 w-2 cursor-ew-resize" />
      {trimmable && (
        <span className="pointer-events-none absolute inset-y-1 right-0 w-1 rounded-r bg-white/60" title="Trim end" />
      )}
    </div>
  );
}

function Waveform({ url }: { url?: string }) {
  const peaks = useWaveform(url);
  if (peaks?.length) {
    const w = 200 / peaks.length;
    return (
      <svg viewBox="0 0 200 20" preserveAspectRatio="none" className="h-4 w-full opacity-90">
        {Array.from(peaks).map((p, i) => {
          const h = 1.5 + (p / 255) * 16.5;
          return <rect key={i} x={i * w} y={(20 - h) / 2} width={Math.max(0.6, w * 0.7)} height={h} fill="#fff" rx="0.4" />;
        })}
      </svg>
    );
  }
  // Procedural placeholder: mock audio clip, or real peaks still decoding.
  return (
    <svg viewBox="0 0 200 20" preserveAspectRatio="none" className="h-4 w-full opacity-60">
      {Array.from({ length: 60 }).map((_, i) => {
        const h = 4 + Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.31)) * 14;
        return <rect key={i} x={i * 3.4} y={(20 - h) / 2} width="1.8" height={h} fill="#fff" rx="1" />;
      })}
    </svg>
  );
}
