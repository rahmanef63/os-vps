"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Clip, type Composition, type Ease, type KfProp } from "../lib/mock-timeline";
import { TabStrip } from "./clip-ui";
import { ClipTabClip } from "./clip-tab-clip";
import { ClipTabAudio } from "./clip-tab-audio";
import { ClipTabAnimate } from "./clip-tab-animate";
import { ClipTabText } from "./clip-tab-text";
import { ClipTabAdjust } from "./clip-tab-adjust";

type TabId = "clip" | "text" | "audio" | "animate" | "adjust";

// Selected-clip inspector, organized into tabs: Clip (identity/timing/speed/
// transition), Text (styling), Audio, Animate (presets + keyframes), Adjust
// (color grading). Tab visibility follows the clip's capabilities.
export function ClipProps(props: {
  clip: Clip;
  comp: Composition;
  frame: number;
  onChange: (patch: Partial<Clip>) => void;
  onSetKey: (k: KfProp, t: number, v: number) => void;
  onRemoveKey: (k: KfProp, t: number) => void;
  onClearKeys: () => void;
  onSeek: (frame: number) => void;
  onDelete: () => void;
  onCrossfade: (frames: number) => void;
  onSpeed: (speed: number) => void;
  onSetEase: (k: KfProp, t: number, e: Ease) => void;
}) {
  const { clip, comp, onChange, onDelete } = props;
  const hasAudio = clip.kind === "audio" || clip.media?.type === "video";
  const isText = clip.text != null;
  const isVisual = clip.kind !== "audio";
  const tabs: { id: TabId; label: string }[] = [
    { id: "clip", label: "Clip" },
    ...(isText ? [{ id: "text", label: "Text" } as const] : []),
    ...(hasAudio ? [{ id: "audio", label: "Audio" } as const] : []),
    ...(isVisual ? [{ id: "animate", label: "Animate" } as const] : []),
    ...(isVisual && !isText ? [{ id: "adjust", label: "Adjust" } as const] : []),
  ];
  const [tab, setTab] = useState<TabId>("clip");
  const active = tabs.some((t) => t.id === tab) ? tab : "clip";

  return (
    <div className="flex flex-col gap-3">
      <TabStrip tabs={tabs} active={active} onPick={setTab} />

      {active === "clip" && (
        <ClipTabClip
          clip={clip}
          comp={comp}
          onChange={onChange}
          onSeek={props.onSeek}
          onCrossfade={props.onCrossfade}
          onSpeed={props.onSpeed}
        />
      )}
      {active === "text" && <ClipTabText clip={clip} onChange={onChange} />}
      {active === "audio" && <ClipTabAudio clip={clip} comp={comp} onChange={onChange} />}
      {active === "animate" && (
        <ClipTabAnimate
          clip={clip}
          comp={comp}
          frame={props.frame}
          onChange={onChange}
          onSetKey={props.onSetKey}
          onRemoveKey={props.onRemoveKey}
          onClearKeys={props.onClearKeys}
          onSeek={props.onSeek}
          onSetEase={props.onSetEase}
        />
      )}
      {active === "adjust" && <ClipTabAdjust clip={clip} onChange={onChange} />}

      <Button
        type="button"
        variant="ghost"
        className="flex h-7 items-center justify-center gap-1.5 rounded-md bg-secondary px-0 text-xs font-normal text-red-500 hover:bg-secondary hover:text-red-500"
        onClick={onDelete}
      >
        <Trash2 className="size-3.5" /> Delete clip
      </Button>
    </div>
  );
}
