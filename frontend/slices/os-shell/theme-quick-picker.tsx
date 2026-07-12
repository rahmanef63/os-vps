"use client";

import { useEffect, useState } from "react";
import { Palette, RotateCcw } from "lucide-react";
import { defineFeature } from "@/features/appshell";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  groupPresets,
  loadPresetRegistry,
  presetSwatches,
  useAppearance,
  type PresetGroup,
} from "@/lib/appearance";
import { cn } from "@/lib/utils";

// Compact menu-bar theme-preset switcher — the same live preset switch Settings
// offers, without opening the Settings app. Lives in os-shell (the consumer) and
// mounts into the appshell's `menuBarStatus` slot, so the brand-free appshell
// never imports the os-vps preset registry.
function ThemeQuickPicker() {
  const { tweaks, setTweaks } = useAppearance();
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<PresetGroup[] | null>(null);

  // Lazy-load the preset registry on first open (keep it off the boot path).
  useEffect(() => {
    if (!open || groups) return;
    loadPresetRegistry()
      .then((reg) => setGroups(groupPresets(reg.items)))
      .catch(() => setGroups([]));
  }, [open, groups]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Theme presets"
          className="h-auto grid size-6 place-items-center rounded-md hover:bg-[var(--hover-strong)]"
        >
          <Palette className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="z-[960] max-h-80 w-64 overflow-y-auto p-2">
        <div className="mb-1.5 flex items-center justify-between px-1">
          <span className="text-xs font-semibold">Theme</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-1.5 text-[11px]"
            disabled={!tweaks.preset}
            onClick={() => setTweaks({ preset: null })}
          >
            <RotateCcw className="size-3" /> Stock
          </Button>
        </div>
        {groups === null ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-2">
            {groups.map((g) => (
              <div key={g.id} className="space-y-1">
                <div className="px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{g.label}</div>
                <div className="grid grid-cols-1 gap-1">
                  {g.items.map((p) => {
                    const active = tweaks.preset === p.name;
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setTweaks({ preset: p.name })}
                        aria-pressed={active}
                        className={cn(
                          "flex items-center gap-2 rounded-md border border-transparent px-1.5 py-1 text-left transition-colors hover:bg-accent",
                          active && "border-border bg-accent",
                        )}
                      >
                        <span className="flex shrink-0 overflow-hidden rounded border border-border">
                          {presetSwatches(p).map((c, i) => (
                            <span key={i} className="size-3" style={{ background: c }} />
                          ))}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-xs">{p.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export const themeQuickPickerFeature = defineFeature({
  id: "theme-quick-picker",
  slots: { menuBarStatus: ThemeQuickPicker },
});
