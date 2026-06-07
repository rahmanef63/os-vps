"use client";

import { useEffect, useState } from "react";
import { Check, Paintbrush, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useAppearance,
  loadPresetRegistry,
  groupPresets,
  presetSwatches,
  type PresetGroup,
  type PresetItem,
} from "@/lib/appearance";
import { SettingsSection as Section } from "@/features/shell-settings";
import { cn } from "@/lib/utils";

// Theme preset picker (ported from rr theme-presets / tweakcn registry).
// Picking a preset rethemes the WHOLE shell — glass chrome, windows, app
// content — via lib/appearance/presets. "Stock" restores the os-rr palette.
function PresetChip({
  preset,
  active,
  onSelect,
}: {
  preset: PresetItem;
  active: boolean;
  onSelect: () => void;
}) {
  const swatches = presetSwatches(preset);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-2.5 rounded-lg border border-border bg-card/60 px-2.5 py-2 text-left transition-colors hover:bg-accent",
        active && "border-ring ring-1 ring-ring",
      )}
    >
      <span className="flex shrink-0 overflow-hidden rounded-md border border-border">
        {swatches.map((c, i) => (
          <span key={i} className="size-4" style={{ background: c }} />
        ))}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs font-medium">
        {preset.title}
      </span>
      {active && <Check className="size-3.5 shrink-0 text-primary" />}
    </button>
  );
}

export function ThemeSection() {
  const { tweaks, setTweaks } = useAppearance();
  const [groups, setGroups] = useState<PresetGroup[] | null>(null);

  useEffect(() => {
    // Inline .then keeps the registry fetch a pure effect (hooks-v6 clean).
    loadPresetRegistry()
      .then((reg) => setGroups(groupPresets(reg.items)))
      .catch(() => setGroups([]));
  }, []);

  return (
    <Section icon={<Paintbrush />} title="Theme">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Color presets restyle the whole OS — bars, windows and apps. Accent
          and wallpaper stay yours to override.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0"
          disabled={!tweaks.preset}
          onClick={() => setTweaks({ preset: null })}
        >
          <RotateCcw /> Stock
        </Button>
      </div>

      {groups === null ? (
        <p className="text-xs text-muted-foreground">Loading presets…</p>
      ) : (
        groups.map((group) => (
          <div key={group.id} className="space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {group.label}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {group.items.map((p) => (
                <PresetChip
                  key={p.name}
                  preset={p}
                  active={tweaks.preset === p.name}
                  onSelect={() => setTweaks({ preset: p.name })}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </Section>
  );
}
