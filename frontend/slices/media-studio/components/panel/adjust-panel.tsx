"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Segmented } from "@/components/ui/segmented";
import {
  SLIDERS,
  ADJ_DEFAULT,
  FILTERS,
  filterStr,
  type Adjustments,
  type AdjustKey,
} from "../../lib/filters";
import { ASPECTS, PREVIEW_GRADIENT } from "../../lib/model";
import { SAFE, SAFE_PLATFORMS, type SafePlatform } from "../../lib/masks";
import { SectionLabel, KSlider } from "./section";

// Adjust tab: aspect presets, 8 filter chips, and the 7 live adjustment sliders.
export function AdjustPanel({
  adjustments,
  activeFilter,
  aspect,
  safe,
  platform,
  onAdjust,
  onFilter,
  onAspect,
  onReset,
  onSafe,
  onPlatform,
}: {
  adjustments: Adjustments;
  activeFilter: string;
  aspect: string;
  safe: boolean;
  platform: SafePlatform;
  onAdjust: (key: AdjustKey, value: number) => void;
  onFilter: (name: string) => void;
  onAspect: (value: string) => void;
  onReset: () => void;
  onSafe: (v: boolean) => void;
  onPlatform: (p: SafePlatform) => void;
}) {
  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <SectionLabel>Aspect ratio</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {ASPECTS.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => onAspect(a.value)}
              className={cn(
                "rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors",
                aspect === a.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-accent",
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <SectionLabel>Safe area</SectionLabel>
          <Switch checked={safe} onCheckedChange={onSafe} />
        </div>
        {safe && (
          <>
            <Segmented
              options={SAFE_PLATFORMS.map((p) => ({ value: p, label: p }))}
              value={platform}
              onChange={onPlatform}
              className="flex w-full flex-wrap"
            />
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              {SAFE[platform].note}
            </p>
          </>
        )}
      </section>

      <section className="space-y-2">
        <SectionLabel>Filters</SectionLabel>
        <div className="grid grid-cols-4 gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.name}
              type="button"
              onClick={() => onFilter(f.name)}
              className="space-y-1"
            >
              <span
                className={cn(
                  "block aspect-square w-full rounded-md ring-1 ring-border",
                  activeFilter === f.name && "ring-2 ring-primary",
                )}
                style={{ background: PREVIEW_GRADIENT, filter: filterStr(f.a) }}
              />
              <span
                className={cn(
                  "block text-center text-[9px] font-medium",
                  activeFilter === f.name
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              >
                {f.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel>Adjustments</SectionLabel>
        {SLIDERS.map((s) => (
          <KSlider
            key={s.key}
            label={s.label}
            value={adjustments[s.key]}
            min={s.min}
            max={s.max}
            unit={s.unit}
            onChange={(v) => onAdjust(s.key, v)}
          />
        ))}
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={onReset}
          disabled={SLIDERS.every((s) => adjustments[s.key] === ADJ_DEFAULT[s.key])}
        >
          Reset
        </Button>
      </section>
    </div>
  );
}
