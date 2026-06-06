"use client";

import { Video, Layers, Type, AudioLines, Lock, Eye, EyeOff, Volume2, VolumeX, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type Track, type TrackKind } from "../lib/mock-timeline";

const KIND_ICON: Record<TrackKind, typeof Video> = { video: Video, overlay: Layers, text: Type, audio: AudioLines };

// Sticky track label: layer up/down reorder, kind icon + name, and lock / hide /
// mute toggles (hide hidden for audio; mute only for audible kinds).
export function TrackHead({
  track,
  index,
  count,
  onTrackPatch,
  onTrackMove,
}: {
  track: Track;
  index: number;
  count: number;
  onTrackPatch: (id: string, patch: Partial<Track>) => void;
  onTrackMove: (id: string, dir: -1 | 1) => void;
}) {
  const Icon = KIND_ICON[track.kind];
  const audible = track.kind === "audio" || track.kind === "video";
  return (
    <div className="sticky left-0 z-10 flex w-[120px] flex-none items-center gap-1 border-b border-r border-border bg-card pl-1 pr-1">
      <span className="flex flex-col">
        <Button
          type="button"
          variant="ghost"
          title="Move layer up (closer to front)"
          disabled={index === 0}
          onClick={() => onTrackMove(track.id, -1)}
          className="grid h-3 w-3.5 gap-0 rounded-none p-0 font-normal text-muted-foreground/50 hover:bg-transparent hover:text-foreground disabled:opacity-20"
        >
          <ChevronUp className="size-2.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          title="Move layer down (further back)"
          disabled={index === count - 1}
          onClick={() => onTrackMove(track.id, 1)}
          className="grid h-3 w-3.5 gap-0 rounded-none p-0 font-normal text-muted-foreground/50 hover:bg-transparent hover:text-foreground disabled:opacity-20"
        >
          <ChevronDown className="size-2.5" />
        </Button>
      </span>
      <Icon className="size-3 flex-none text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-muted-foreground">{track.name}</span>
      <TrackToggle
        on={!!track.lock}
        title="Lock track"
        onClick={() => onTrackPatch(track.id, { lock: !track.lock })}
      >
        <Lock className="size-2.5" />
      </TrackToggle>
      {track.kind !== "audio" && (
        <TrackToggle
          on={!!track.hide}
          title="Hide track"
          onClick={() => onTrackPatch(track.id, { hide: !track.hide })}
        >
          {track.hide ? <EyeOff className="size-2.5" /> : <Eye className="size-2.5" />}
        </TrackToggle>
      )}
      {audible && (
        <TrackToggle
          on={!!track.mute}
          title="Mute track"
          onClick={() => onTrackPatch(track.id, { mute: !track.mute })}
        >
          {track.mute ? <VolumeX className="size-2.5" /> : <Volume2 className="size-2.5" />}
        </TrackToggle>
      )}
    </div>
  );
}

function TrackToggle({
  on,
  title,
  onClick,
  children,
}: {
  on: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      title={title}
      onClick={onClick}
      className={cn(
        "grid size-4 flex-none place-items-center gap-0 rounded p-0 font-normal hover:bg-transparent",
        on ? "bg-primary/20 text-primary" : "text-muted-foreground/50 hover:text-foreground",
      )}
    >
      {children}
    </Button>
  );
}
