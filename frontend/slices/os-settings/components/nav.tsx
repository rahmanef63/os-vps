"use client";

import type { ComponentType } from "react";
import {
  Info,
  Paintbrush,
  Palette,
  Server,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SectionId =
  | "appearance" | "theme" | "ai" | "devices" | "server" | "about";

export const SECTIONS: ReadonlyArray<{
  id: SectionId;
  label: string;
  blurb: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { id: "appearance", label: "Appearance", blurb: "Style, wallpaper, accent, layout", icon: Palette },
  { id: "theme", label: "Theme", blurb: "Color presets for the whole OS", icon: Paintbrush },
  { id: "ai", label: "AI", blurb: "Model and API key", icon: Sparkles },
  { id: "devices", label: "Devices", blurb: "Approved browsers and sessions", icon: ShieldCheck },
  { id: "server", label: "Server", blurb: "Mock or live host data", icon: Server },
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
    <nav className="flex flex-col gap-0.5 p-2">
      {SECTIONS.map(({ id, label, blurb, icon: Icon }) => {
        const on = showActive && id === active;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-current={on ? "true" : undefined}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors",
              on ? "bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-md",
                on ? "bg-primary-foreground/20" : "bg-primary/12 text-primary",
              )}
            >
              <Icon className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium leading-tight">
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
