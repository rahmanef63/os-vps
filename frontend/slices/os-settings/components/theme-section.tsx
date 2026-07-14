"use client";

import { useEffect, useState } from "react";
import { Check, RotateCcw, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import {
  FONT_SCALE_OPTIONS,
  THEME_MODE_OPTIONS,
  groupPresets,
  loadPresetRegistry,
  presetSwatches,
  useAppearance,
  type PresetGroup,
  type PresetItem,
  type Theme,
} from "@/lib/appearance";
import { SettingsSection as Section } from "@/features/shell-settings";
import { cn } from "@/lib/utils";

function PresetChip({ preset, active, onSelect }: { preset: PresetItem; active: boolean; onSelect: () => void }) {
  const swatches = presetSwatches(preset);
  // The preset owns the typeface too — surface which face it ships.
  const fontName = preset.cssVars?.theme?.["font-sans"]?.split(",")[0]?.replace(/['"]/g, "").trim();
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card/60 px-2.5 py-1.5 text-left transition-colors hover:bg-accent",
        active && "border-ring ring-2 ring-ring/40",
      )}
    >
      <span className="flex shrink-0 overflow-hidden rounded-md border border-border">
        {swatches.map((c, i) => <span key={i} className="size-4" style={{ background: c }} />)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium">{preset.title}</span>
        {fontName && <span className="block truncate text-[10px] leading-tight text-muted-foreground">{fontName}</span>}
      </span>
      {active && <Check className="size-3.5 shrink-0 text-primary" />}
    </button>
  );
}

// Compact live preview — fills the left of the sticky deck.
function ThemePreview() {
  return (
    <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-pop)]">
      <div className="flex items-center gap-1.5 border-b border-border bg-sidebar px-2.5 py-1.5">
        <span className="size-2 rounded-full bg-destructive" />
        <span className="size-2 rounded-full bg-warning" />
        <span className="size-2 rounded-full bg-success" />
        <span className="ml-auto text-[10px] text-muted-foreground">Live preview</span>
      </div>
      <div className="space-y-1.5 p-2.5">
        <div className="h-2 w-20 rounded-full bg-foreground/80" />
        <div className="h-1.5 w-28 rounded-full bg-muted-foreground/35" />
        <div className="grid grid-cols-3 gap-1.5 pt-0.5">
          <span className="h-6 rounded-md bg-primary" />
          <span className="h-6 rounded-md bg-secondary" />
          <span className="h-6 rounded-md bg-muted" />
        </div>
      </div>
    </div>
  );
}

function MiniRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-3">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export function ThemeSection() {
  const { tweaks, setTweaks } = useAppearance();
  const [groups, setGroups] = useState<PresetGroup[] | null>(null);

  useEffect(() => {
    loadPresetRegistry()
      .then((reg) => setGroups(groupPresets(reg.items)))
      .catch(() => setGroups([]));
  }, []);

  return (
    <div className="space-y-4">
      {/* Sticky deck: the live preview + mode controls stay pinned to the top
          of the settings scroll pane while the preset list below scrolls. */}
      <div className="sticky top-0 z-10 rounded-2xl border border-border bg-background/90 p-2.5 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
          <ThemePreview />
          <div className="flex w-full shrink-0 flex-col justify-center gap-1.5 sm:w-72">
            <MiniRow label="Light / dark">
              <Segmented
                options={THEME_MODE_OPTIONS}
                value={tweaks.theme}
                onChange={(v) => setTweaks({ theme: v as Theme })}
              />
            </MiniRow>
            <MiniRow label="Font size">
              <Segmented
                options={FONT_SCALE_OPTIONS}
                value={String(tweaks.fontScale)}
                onChange={(v) => setTweaks({ fontScale: Number(v) })}
              />
            </MiniRow>
            <MiniRow label="High contrast">
              <Switch checked={tweaks.highContrast} onCheckedChange={(highContrast) => setTweaks({ highContrast })} />
            </MiniRow>
          </div>
        </div>
      </div>

      <Section icon={<Type />} title="Theme presets">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 text-[11px] leading-relaxed text-muted-foreground">
            One preset = colors, radius and typeface (fonts auto-load).
          </p>
          <Button type="button" variant="secondary" size="sm" className="shrink-0" disabled={!tweaks.preset} onClick={() => setTweaks({ preset: null })}>
            <RotateCcw /> Stock
          </Button>
        </div>
        {groups === null ? (
          <p className="text-xs text-muted-foreground">Loading presets…</p>
        ) : (
          /* Plain overflow scroller on purpose: Radix ScrollArea with max-h on
             the Root never constrains its viewport, so the list could not
             scroll — this one does. */
          <div className="max-h-[clamp(14rem,46vh,26rem)] overflow-y-auto overscroll-contain rounded-lg bg-muted/30">
            <div className="space-y-2.5 p-2">
              {groups.map((group) => (
                <div key={group.id} className="space-y-1.5">
                  <div className="px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{group.label}</div>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {group.items.map((p) => (
                      <PresetChip key={p.name} preset={p} active={tweaks.preset === p.name} onSelect={() => setTweaks({ preset: p.name })} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
