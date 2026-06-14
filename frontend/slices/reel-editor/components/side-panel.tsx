"use client";

import { memo } from "react";
import {
  patchClip,
  setKeyframe,
  setKeyTrack,
  setCrossfade,
  setSpeed,
} from "../lib/composition";
import { removeKeyAt, setEaseAt } from "../lib/keyframes";
import { type Clip, type Composition, type KfProp } from "../lib/mock-timeline";
import { type PanelMode } from "./toolbar";
import { ClipProps } from "./clip-props";
import { CompProps } from "./comp-props";
import { AiPanel, type AiMessage } from "./ai-panel";
import { useFrame } from "../lib/frame-store";

// Right side panel: AI assistant, selected-clip props, or composition props.
// Subscribes to the external frame-store locally — only this panel + ClipProps
// re-render per playback tick (for the keyframe diamond), not the orchestrator.
export const SidePanel = memo(function SidePanel({
  mode,
  comp,
  selected,
  aiLog,
  apply,
  onChange,
  onRatio,
  onSeek,
  onDelete,
  onAi,
}: {
  mode: PanelMode;
  comp: Composition;
  selected: Clip | null;
  aiLog: AiMessage[];
  apply: (fn: (c: Composition) => Composition, commit?: boolean) => void;
  onChange: (patch: Partial<Clip>) => void;
  onRatio: (w: number, h: number) => void;
  onSeek: (frame: number) => void;
  onDelete: () => void;
  onAi: (text: string) => void;
}) {
  const frame = useFrame();
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
      {mode === "ai" ? (
        <AiPanel log={aiLog} hasSel={!!selected} onSend={onAi} />
      ) : selected ? (
        <ClipProps
          clip={selected}
          comp={comp}
          frame={frame}
          onChange={onChange}
          onSetKey={(k, t, v) => apply((c) => setKeyframe(c, selected.id, k, t, v))}
          onRemoveKey={(k: KfProp, t) => apply((c) => setKeyTrack(c, selected.id, k, removeKeyAt(selected.kf?.[k], t)))}
          onClearKeys={() => apply((c) => patchClip(c, selected.id, { kf: undefined }), true)}
          onSeek={onSeek}
          onDelete={onDelete}
          onCrossfade={(f) => apply((c) => setCrossfade(c, selected.id, f), true)}
          onSpeed={(s) => apply((c) => setSpeed(c, selected.id, s), true)}
          onSetEase={(k, t, e) => apply((c) => setKeyTrack(c, selected.id, k, setEaseAt(selected.kf?.[k], t, e)), true)}
        />
      ) : (
        <CompProps
          comp={comp}
          onRatio={onRatio}
          onFps={(fps) => apply((c) => ({ ...c, fps }), true)}
          onDuration={(duration) => apply((c) => ({ ...c, duration }))}
        />
      )}
    </div>
  );
});
