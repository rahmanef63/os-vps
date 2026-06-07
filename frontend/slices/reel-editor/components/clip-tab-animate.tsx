"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { type Clip, type Composition, type Ease, type KfProp } from "../lib/mock-timeline";
import { KF_PROPS, EASES, clipVal, animatedCount } from "../lib/keyframes";
import { ANIM_PRESETS, applyAnimPreset } from "../lib/anim-presets";
import { KeyDiamond, KeyNav, KeyLane } from "./keyframe-lane";
import { Header } from "./clip-ui";

// Animate tab: one-click entrance/exit presets + the per-property keyframe
// editor (diamond at playhead, prev/next nav, lane, ease picker).
export function ClipTabAnimate({
  clip,
  comp,
  frame,
  onChange,
  onSetKey,
  onRemoveKey,
  onClearKeys,
  onSeek,
  onSetEase,
}: {
  clip: Clip;
  comp: Composition;
  frame: number;
  onChange: (patch: Partial<Clip>) => void;
  onSetKey: (k: KfProp, t: number, v: number) => void;
  onRemoveKey: (k: KfProp, t: number) => void;
  onClearKeys: () => void;
  onSeek: (frame: number) => void;
  onSetEase: (k: KfProp, t: number, e: Ease) => void;
}) {
  const local = Math.max(0, Math.min(clip.len, Math.round(frame - clip.start)));
  const inClip = frame >= clip.start && frame < clip.start + clip.len;
  const seekLocal = (t: number) => onSeek(clip.start + Math.max(0, Math.min(clip.len, t)));
  const onSlide = (k: KfProp, v: number) => {
    if (clip.kf?.[k]?.length) onSetKey(k, local, v);
    else onChange({ base: { ...clip.base, [k]: v } });
  };

  return (
    <>
      <Header
        right={
          <span className={cn("font-mono text-[10px]", inClip ? "text-muted-foreground" : "text-warning")}>
            {inClip ? `◆ ${(local / comp.fps).toFixed(2)}s` : "playhead off-clip"}
          </span>
        }
      >
        Animate
      </Header>

      {(["in", "out"] as const).map((group) => (
        <div key={group} className="flex items-center gap-1">
          <span className="w-7 text-[10px] font-bold uppercase text-muted-foreground">{group}</span>
          {ANIM_PRESETS.filter((p) => p.group === group).map((p) => (
            <Button
              key={p.id}
              type="button"
              variant="ghost"
              onClick={() => onChange({ kf: applyAnimPreset(clip, p.id) })}
              className="h-6 flex-1 rounded-md bg-secondary px-0 text-xs font-normal text-foreground hover:bg-secondary/70"
            >
              {p.label}
            </Button>
          ))}
        </div>
      ))}

      {KF_PROPS.map((p) => {
        const keys = clip.kf?.[p.k];
        const has = !!keys?.length;
        const val = Math.round(clipVal(clip, p.k, local));
        const here = !!keys?.some((x) => x.t === local);
        return (
          <div key={p.k}>
            <div className="mb-1 flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                title={!inClip ? "Move playhead onto clip" : here ? "Remove keyframe" : "Add keyframe"}
                disabled={!inClip}
                onClick={() => (here ? onRemoveKey(p.k, local) : onSetKey(p.k, local, val))}
                className={cn("grid size-4 place-items-center gap-0 rounded-none p-0 hover:bg-transparent", !inClip && "opacity-40")}
              >
                <KeyDiamond filled={here} dim={!has} />
              </Button>
              <span className="flex-1 text-[11px] font-semibold text-muted-foreground">{p.label}</span>
              {has && <KeyNav keys={keys!} local={local} onSeek={seekLocal} />}
              <span className="min-w-8 text-right text-[11px] tabular-nums text-muted-foreground">
                {val}
                {p.unit}
              </span>
            </div>
            <Slider min={p.min} max={p.max} step={p.step} value={val} onChange={(e) => onSlide(p.k, Number(e.target.value))} />
            {has && <KeyLane keys={keys!} len={clip.len} local={local} onSeek={seekLocal} />}
            {here && (
              <div className="mt-1 flex gap-0.5">
                {EASES.map((opt) => {
                  const cur = keys?.find((x) => x.t === local)?.e ?? "linear";
                  return (
                    <Button
                      key={opt.e}
                      type="button"
                      variant="ghost"
                      title={`Ease: ${opt.label}`}
                      onClick={() => onSetEase(p.k, local, opt.e)}
                      className={cn(
                        "h-5 flex-1 rounded px-0 text-[10px] font-normal hover:bg-secondary",
                        cur === opt.e ? "bg-primary text-primary-foreground hover:bg-primary" : "bg-secondary text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {animatedCount(clip) > 0 && (
        <Button type="button" variant="ghost" className="h-6 rounded-md bg-secondary px-0 text-xs font-normal text-foreground hover:bg-secondary" onClick={onClearKeys}>
          Clear all keyframes
        </Button>
      )}
    </>
  );
}
