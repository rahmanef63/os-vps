"use client";

import { useEffect, useState } from "react";
import { Check, Paintbrush, RotateCcw, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { SettingsRow as Row, SettingsSection as Section } from "@/features/shell-settings";
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
        "flex min-h-12 items-center gap-2.5 rounded-xl border border-border bg-card/60 px-3 py-2 text-left transition-colors hover:bg-accent",
        active && "border-ring ring-2 ring-ring/40",
      )}
    >
      <span className="flex shrink-0 overflow-hidden rounded-lg border border-border">
        {swatches.map((c, i) => <span key={i} className="size-5" style={{ background: c }} />)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium">{preset.title}</span>
        {fontName && <span className="block truncate text-[10px] text-muted-foreground">{fontName}</span>}
      </span>
      {active && <Check className="size-3.5 shrink-0 text-primary" />}
    </button>
  );
}

function ThemePreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-pop)]">
      <div className="flex items-center gap-1.5 border-b border-border bg-sidebar px-3 py-2">
        <span className="size-2.5 rounded-full bg-destructive" />
        <span className="size-2.5 rounded-full bg-warning" />
        <span className="size-2.5 rounded-full bg-success" />
        <span className="ml-auto text-[10px] text-muted-foreground">Live preview</span>
      </div>
      <div className="space-y-2 p-3">
        <div className="h-3 w-24 rounded-full bg-foreground/80" />
        <div className="h-2 w-36 rounded-full bg-muted-foreground/35" />
        <div className="grid grid-cols-3 gap-2 pt-1">
          <span className="h-10 rounded-xl bg-primary" />
          <span className="h-10 rounded-xl bg-secondary" />
          <span className="h-10 rounded-xl bg-muted" />
        </div>
      </div>
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
    <div className="space-y-5">
      <Section icon={<Paintbrush />} title="Theme system">
        <ThemePreview />
        <Row label="Light / dark">
          <Segmented
            options={THEME_MODE_OPTIONS}
            value={tweaks.theme}
            onChange={(v) => setTweaks({ theme: v as Theme })}
            className="w-full flex-wrap sm:w-auto"
          />
        </Row>
        <Row label="Font size">
          <Segmented
            options={FONT_SCALE_OPTIONS}
            value={String(tweaks.fontScale)}
            onChange={(v) => setTweaks({ fontScale: Number(v) })}
            className="w-full flex-wrap sm:w-auto"
          />
        </Row>
        <Row label="High contrast">
          <Switch checked={tweaks.highContrast} onCheckedChange={(highContrast) => setTweaks({ highContrast })} />
        </Row>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Theme, preset, font scale, and contrast all write to the same appearance store and update the shell live.
          The font family comes from the theme preset below — pick a preset, get its typeface.
        </p>
      </Section>

      <Section icon={<Type />} title="Theme presets">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            One preset rethemes colors, radius AND typography — bars, windows, cards, and app content from a single token injection (fonts auto-load).
          </p>
          <Button type="button" variant="secondary" size="sm" className="shrink-0" disabled={!tweaks.preset} onClick={() => setTweaks({ preset: null })}>
            <RotateCcw /> Stock
          </Button>
        </div>
        {groups === null ? (
          <p className="text-xs text-muted-foreground">Loading presets…</p>
        ) : (
          <ScrollArea className="max-h-[clamp(16rem,42vh,28rem)] rounded-xl border border-border bg-card/30">
            <div className="space-y-3 p-2.5">
              {groups.map((group) => (
                <div key={group.id} className="space-y-2">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{group.label}</div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {group.items.map((p) => (
                      <PresetChip key={p.name} preset={p} active={tweaks.preset === p.name} onSelect={() => setTweaks({ preset: p.name })} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </Section>
    </div>
  );
}
