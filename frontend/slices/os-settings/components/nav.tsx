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

export const SECTIONS: ReadonlyArray<{
  id: SectionId;
  label: string;
  blurb: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { id: "appearance", label: "Appearance", blurb: "Style, accent, wallpaper, device", icon: Palette },
  { id: "theme", label: "Theme", blurb: "Mode, presets, font, contrast", icon: Paintbrush },
  { id: "ai", label: "AI", blurb: "Model and API key", icon: Sparkles },
  { id: "quicklinks", label: "Quicklink", blurb: "Website shortcuts with favicons", icon: Link2 },
  { id: "devices", label: "Devices", blurb: "Approved browsers and sessions", icon: ShieldCheck },
  { id: "server", label: "Server", blurb: "Mock or live host data", icon: Server },
  { id: "browser", label: "Browser", blurb: "Remote Chromium runtime status", icon: Globe },
  { id: "about", label: "About", blurb: "System info and reset", icon: Info },
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
