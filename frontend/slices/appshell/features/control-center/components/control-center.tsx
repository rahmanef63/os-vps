"use client";

import { type LucideIcon, Bell, Moon, MoonStar, Sun, Server, Cloud, Sparkles, Layers, Search } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useWindowOrder,
  closeAll,
  toggleInspector,
  toggleSpotlight,
  toggleFocusMode,
  useFocusMode,
  useShellUI,
  useShellAppearance,
  useServerToggle,
} from "@/features/appshell";

// iPhone Control Center — pulls down from the top. Only REAL toggles (this is a
// web app: no wifi/cellular/battery/brightness to fake). Appearance + the optional
// server toggle come from the shell capabilities so this stays a single source of
// truth. Open state is owned by the mobile surface and read via the shell-UI context.
export function ControlCenter() {
  const { controlCenterOpen: open, setControlCenterOpen: onOpenChange } = useShellUI();
  const { theme, setTheme } = useShellAppearance();
  const server = useServerToggle();
  const openCount = useWindowOrder().length;
  const focus = useFocusMode();
  const dark = theme === "dark";
  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="top"
        className="rounded-b-3xl border-border bg-[var(--glass-menu)] p-4 pt-9 backdrop-blur-xl"
      >
        <SheetTitle className="sr-only">Control Center</SheetTitle>
        <SheetDescription className="sr-only">Quick system toggles</SheetDescription>
        <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-2.5">
          <Tile
            icon={dark ? Moon : Sun}
            label="Appearance"
            value={dark ? "Dark" : "Light"}
            on={dark}
            onClick={() => setTheme(dark ? "light" : "dark")}
          />
          {server && (
            <Tile
              icon={server.live ? Cloud : Server}
              label="Server"
              value={server.label}
              on={server.live}
              disabled={server.locked}
              onClick={server.toggle}
            />
          )}
          <Tile
            icon={focus ? MoonStar : Bell}
            label="Focus"
            value={focus ? "On — toasts to log" : "Off"}
            on={focus}
            onClick={toggleFocusMode}
          />
          <Tile icon={Search} label="Search" value="Spotlight" onClick={() => { close(); toggleSpotlight(); }} />
          <Tile icon={Sparkles} label="Assistant" value="AI Inspector" onClick={() => { close(); toggleInspector(); }} />
          <Tile
            icon={Layers}
            label="Windows"
            value={openCount ? `Close all (${openCount})` : "None open"}
            disabled={openCount === 0}
            onClick={() => { closeAll(); close(); }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  on = false,
  disabled = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  on?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-auto flex items-center gap-3 rounded-2xl border border-border px-3.5 py-3 text-left transition-colors disabled:opacity-40",
        on ? "bg-primary text-primary-foreground" : "bg-background/60 hover:bg-background",
      )}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full",
          on ? "bg-primary-foreground/20" : "bg-muted",
        )}
      >
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold leading-tight">{label}</span>
        <span className={cn("block truncate text-[11px]", on ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {value}
        </span>
      </span>
    </Button>
  );
}
