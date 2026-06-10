"use client";
/* Android shell sub-surfaces — the overlays the main shell toggles: quick-
   settings Shade, Recents card deck, and the shared Clock. Split from
   android-shell.tsx so each file stays small (rr ≤200 LOC gate). */
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { Wifi, Bluetooth, Moon, Flashlight, Plane, RotateCw, Sun, X } from "lucide-react";
import { shellStore, closeWindow, closeAll } from "../../../lib/store";
import { useSwipeUpClose } from "../../../hooks/use-swipe-close";
import { AppIcon } from "../../app-icon";
import type { AppDescriptor, WindowState } from "../../../lib/types";

export function Recents({ order, apps, onResume, onHome }: { order: string[]; apps: AppDescriptor[]; onResume: (id: string) => void; onHome: () => void }) {
  const wins = order.map((id) => shellStore.getWindow(id)).filter(Boolean) as WindowState[];
  return (
    <div className="absolute inset-0 z-[30] flex flex-col bg-background/90 backdrop-blur-xl" onClick={onHome}>
      <div className="flex min-h-0 flex-1 items-center gap-3 overflow-x-auto p-5" onClick={(e) => e.stopPropagation()}>
        {wins.length === 0 && <div className="m-auto text-sm text-muted-foreground">No recent apps</div>}
        {wins.map((w) => (
          <RecentCard key={w.id} win={w} app={apps.find((a) => a.id === w.app)} onResume={() => onResume(w.id)} />
        ))}
      </div>
      {wins.length > 0 && (
        <div
          className="flex shrink-0 items-center justify-center pt-1"
          style={{ paddingBottom: "calc(72px + var(--sai-bottom))" }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={() => { closeAll(); onHome(); }}
            className="h-auto rounded-full bg-muted px-4 py-1.5 text-[13px] font-semibold text-foreground hover:bg-muted/80"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}

function RecentCard({ win, app, onResume }: { win: WindowState; app?: AppDescriptor; onResume: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { onPointerDown, draggedRef } = useSwipeUpClose(ref, () => closeWindow(win.id));
  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onClick={(e) => {
        e.stopPropagation(); // a card tap resumes; only empty space → home
        if (!draggedRef.current) onResume();
      }}
      style={{ touchAction: "pan-x" }}
      className="flex h-[60%] w-44 shrink-0 cursor-grab flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
    >
      <span className="flex items-center gap-2 px-3 py-2">
        {app && <span className="size-5"><AppIcon app={app} /></span>}
        <span className="min-w-0 flex-1 truncate text-left text-xs font-medium">{win.title}</span>
        <button
          type="button"
          aria-label={`Close ${win.title}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation(); // don't let the card's onClick resume the app
            closeWindow(win.id);
          }}
          className="-mr-1 flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/10 active:bg-foreground/20"
        >
          <X className="size-3.5" />
        </button>
      </span>
      <span className="min-h-0 flex-1" style={{ background: app?.gradient, opacity: 0.15 }} />
    </div>
  );
}

const TILES = [
  { id: "wifi", label: "Wi-Fi", icon: Wifi, on: true },
  { id: "bt", label: "Bluetooth", icon: Bluetooth, on: true },
  { id: "dnd", label: "Do Not Disturb", icon: Moon, on: false },
  { id: "flash", label: "Flashlight", icon: Flashlight, on: false },
  { id: "plane", label: "Airplane", icon: Plane, on: false },
  { id: "rotate", label: "Auto-rotate", icon: RotateCw, on: true },
];

export function Shade({ onClose }: { onClose: () => void }) {
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(TILES.map((t) => [t.id, t.on])));
  return (
    <div className="absolute inset-0 z-[40] bg-black/30" onClick={onClose}>
      <div className="rounded-b-3xl border-b border-border bg-card/95 p-4 shadow-xl backdrop-blur-xl [animation:ccDrop_.22s_ease]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <Clock mode="datetime" />
          <Button type="button" variant="ghost" onClick={onClose} aria-label="Close" className="h-auto p-0 font-normal hover:bg-transparent"><X className="size-4" /></Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {TILES.map((t) => {
            const Icon = t.icon;
            const active = on[t.id];
            return (
              <Button type="button" variant="ghost"
                key={t.id}
                onClick={() => setOn((s) => ({ ...s, [t.id]: !s[t.id] }))}
                className={cn(`h-auto p-0 font-normal hover:bg-transparent flex items-center gap-2 rounded-2xl px-3 py-3 text-left text-xs ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`)}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{t.label}</span>
              </Button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Sun className="size-4 text-muted-foreground" />
          <input type="range" defaultValue={70} className="w-full accent-primary" aria-label="Brightness" />
        </div>
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-foreground/20" />
      </div>
    </div>
  );
}

export function Clock({ mode }: { mode: "time" | "big" | "date" | "datetime" }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  if (mode === "big") return <div className="text-5xl font-light tracking-tight">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>;
  if (mode === "date") return <div className="text-sm text-muted-foreground">{now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}</div>;
  if (mode === "datetime") return <span>{now.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })} · {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>;
  return <span>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>;
}
