"use client";

import type { ComponentType } from "react";
import {
  Globe,
  Info,
  Link2,
  Paintbrush,
  Palette,
  Server,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SectionId =
  | "appearance" | "theme" | "ai" | "quicklinks" | "devices" | "server" | "browser" | "about";

// Semantic buckets for the iOS grouped index (mobile). Reorder-safe: the mobile
// cards derive from this field, not an index slice, so adding/reordering a
// section can't silently re-bucket it.
export type SettingsGroup = "personalization" | "services" | "system";

// Per-category tile colors — fixed like macOS System Settings' category glyphs
// (Bluetooth stays blue in dark mode); intentionally NOT theme tokens, mirroring
// the raw-value precedent in AppDescriptor.gradient.
export const SECTIONS: ReadonlyArray<{
  id: SectionId;
  label: string;
  blurb: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
  group: SettingsGroup;
}> = [
  { id: "appearance", label: "Appearance", blurb: "Style, accent, wallpaper, device", icon: Palette, color: "#0a84ff", group: "personalization" },
  { id: "theme", label: "Theme", blurb: "Mode, presets, font, contrast", icon: Paintbrush, color: "#ff375f", group: "personalization" },
  { id: "ai", label: "AI", blurb: "Model and API key", icon: Sparkles, color: "#bf5af2", group: "services" },
  { id: "quicklinks", label: "Quicklink", blurb: "Website shortcuts with favicons", icon: Link2, color: "#5e5ce6", group: "services" },
  { id: "devices", label: "Devices", blurb: "Approved browsers and sessions", icon: ShieldCheck, color: "#30d158", group: "system" },
  { id: "server", label: "Server", blurb: "Mock or live host data", icon: Server, color: "#ff9f0a", group: "system" },
  { id: "browser", label: "Browser", blurb: "Remote Chromium runtime status", icon: Globe, color: "#64d2ff", group: "system" },
  { id: "about", label: "About", blurb: "System info and reset", icon: Info, color: "#8e8e93", group: "system" },
];

// System Settings top tab strip: every section visible at a glance, scrolls
// horizontally when the window is too narrow to fit all tabs. Active tab fills
// with the accent; icons tint from the theme so presets restyle them too.
export function SettingsTabs({
  active,
  onSelect,
}: {
  active: SectionId;
  onSelect: (id: SectionId) => void;
}) {
  return (
    <nav
      role="tablist"
      aria-label="Settings"
      className="flex gap-1 overflow-x-auto p-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      {SECTIONS.map(({ id, label, icon: Icon }) => {
        const on = id === active;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={on}
            title={SECTIONS.find((s) => s.id === id)?.blurb}
            onClick={() => onSelect(id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium leading-none transition-colors min-h-9",
              on ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// macOS System Settings sidebar: a vertical category list with fixed colored
// glyph tiles (Apple's category convention). Same SECTIONS, same onSelect — only
// the presentation differs from the Windows tab strip. Active row fills accent.
export function SettingsSidebar({
  active,
  onSelect,
}: {
  active: SectionId;
  onSelect: (id: SectionId) => void;
}) {
  return (
    <nav role="tablist" aria-label="Settings sections" className="flex h-full flex-col gap-0.5 overflow-y-auto p-2">
      {SECTIONS.map(({ id, label, icon: Icon, color }) => {
        const on = id === active;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={on}
            title={SECTIONS.find((s) => s.id === id)?.blurb}
            onClick={() => onSelect(id)}
            className={cn(
              "flex min-h-9 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] font-medium leading-tight transition-colors",
              on ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent",
            )}
          >
            <span
              className="grid size-[26px] shrink-0 place-items-center rounded-[7px] shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
              style={{ background: color }}
            >
              <Icon className="size-[15px] text-white" />
            </span>
            <span className="min-w-0 flex-1 truncate">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
