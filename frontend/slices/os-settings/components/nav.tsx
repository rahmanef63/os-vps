"use client";

import type { ComponentType } from "react";
import {
  Globe,
  Info,
  Paintbrush,
  Palette,
  Server,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SectionId =
  | "appearance" | "theme" | "ai" | "devices" | "server" | "browser" | "about";

export const SECTIONS: ReadonlyArray<{
  id: SectionId;
  label: string;
  blurb: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { id: "appearance", label: "Appearance", blurb: "Style, accent, wallpaper, device", icon: Palette },
  { id: "theme", label: "Theme", blurb: "Mode, presets, font, contrast", icon: Paintbrush },
  { id: "ai", label: "AI", blurb: "Model and API key", icon: Sparkles },
  { id: "devices", label: "Devices", blurb: "Approved browsers and sessions", icon: ShieldCheck },
  { id: "server", label: "Server", blurb: "Mock or live host data", icon: Server },
  { id: "browser", label: "Browser", blurb: "Remote Chromium runtime status", icon: Globe },
  { id: "about", label: "About", blurb: "System info and reset", icon: Info },
];

// macOS System Settings-style nav: icon tile + label rows; active row fills
// with the accent. Tiles tint from the theme so presets restyle them too.
export function SettingsNav({
  active,
  showActive,
  onSelect,
}: {
  active: SectionId;
  /** Desktop highlights the open section; the mobile list view doesn't. */
  showActive: boolean;
  onSelect: (id: SectionId) => void;
}) {
  return (
    <nav className={cn("flex flex-col", showActive ? "gap-0.5 p-2" : "gap-2 p-3")}>
      {SECTIONS.map(({ id, label, blurb, icon: Icon }) => {
        const on = showActive && id === active;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-current={on ? "true" : undefined}
            className={cn(
              showActive
                ? "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors"
                : "flex w-full items-center gap-3 rounded-2xl border border-border bg-card/65 px-3 py-3 text-left shadow-sm transition-colors active:scale-[0.99]",
              on ? "bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            <span
              className={cn(
                showActive ? "grid size-6 shrink-0 place-items-center rounded-md" : "grid size-9 shrink-0 place-items-center rounded-xl",
                on ? "bg-primary-foreground/20" : "bg-primary/12 text-primary",
              )}
            >
              <Icon className={cn(showActive ? "size-3.5" : "size-4")} />
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn("block truncate font-medium leading-tight", showActive ? "text-[13px]" : "text-sm")}>
                {label}
              </span>
              <span
                className={cn(
                  "block truncate text-[10px] leading-tight",
                  on ? "text-primary-foreground/75" : "text-muted-foreground",
                )}
              >
                {blurb}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
