"use client";
/* Android shell sub-surfaces — the overlays + home pieces the main shell
   toggles: Recents card deck, App Drawer, and the home grid cell. Split from
   android-shell.tsx so each file stays small (rr ≤200 LOC gate). The old fake
   quick-settings Shade is gone: pull-down now opens the REAL Control Center
   feature via the controlCenter slot (working toggles, single source). */
import { Button } from "@/components/ui/button";
import { useMemo, useState, useRef } from "react";
import { Search, X } from "lucide-react";
import { shellStore, closeWindow, closeAll } from "../../../lib/store";
import { useSwipeUpClose } from "../../../hooks/use-swipe-close";
import { AppIcon } from "../../app-icon";
import type { AppDescriptor, WindowState } from "../../../lib/types";

export function Recents({ order, apps, onResume, onHome }: { order: string[]; apps: AppDescriptor[]; onResume: (id: string) => void; onHome: () => void }) {
  const wins = order.map((id) => shellStore.getWindow(id)).filter(Boolean) as WindowState[];
  return (
    <div className="absolute inset-0 z-[30] flex flex-col bg-background/90 backdrop-blur-xl" onClick={onHome}>
      {/* Empty deck must stay tappable-through: the inner container fills the
          overlay (no Clear-all bar), so swallowing clicks would trap the user
          with no exit (NavBar sits under the z-30 overlay). */}
      <div className="flex min-h-0 flex-1 items-center gap-3 overflow-x-auto p-5" onClick={(e) => { if (wins.length > 0) e.stopPropagation(); }}>
        {wins.length === 0 && <div className="m-auto text-sm text-muted-foreground">No recent apps · tap to go home</div>}
        {wins.map((w) => (
          <RecentCard key={w.id} win={w} app={apps.find((a) => a.id === w.app)} onResume={() => onResume(w.id)} />
        ))}
      </div>
      {wins.length > 0 && (
        <div
          className="flex shrink-0 items-center justify-center pt-1"
          style={{ paddingBottom: "calc(var(--android-nav) + var(--sai-bottom))" }}
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
          className="-mr-1 flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/10 active:bg-foreground/20 [@media(pointer:coarse)]:size-9"
        >
          <X className="size-3.5" />
        </button>
      </span>
      <span className="min-h-0 flex-1" style={{ background: app?.gradient, opacity: 0.15 }} />
    </div>
  );
}

export function AppCell({ app, onClick }: { app: AppDescriptor; onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" onClick={onClick} className="h-auto p-0 font-normal hover:bg-transparent flex flex-col items-center gap-1.5">
      <span className="size-14"><AppIcon app={app} /></span>
      <span className="w-full truncate text-center text-[11px]">{app.title}</span>
    </Button>
  );
}

export function AppDrawer({ apps, onLaunch, onClose }: { apps: AppDescriptor[]; onLaunch: (a: AppDescriptor) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => apps.filter((a) => a.title.toLowerCase().includes(q.toLowerCase())), [apps, q]);
  return (
    <div className="absolute inset-0 z-[30] flex flex-col bg-background/95 backdrop-blur-xl [animation:appOpen_.2s_ease]">
      {/* Visually a thin pull handle, but a ≥36px hit area (same treatment as
          the iOS home indicator) so it's actually closable by thumb. */}
      <Button
        type="button"
        variant="ghost"
        onClick={onClose}
        aria-label="Close app drawer"
        className="mx-auto flex h-9 w-24 items-center justify-center p-0 hover:bg-transparent"
      >
        <span className="h-1 w-10 rounded-full bg-foreground/30" />
      </Button>
      <div className="mx-4 mt-1 flex h-11 items-center gap-3 rounded-full border border-border bg-card px-4">
        <Search className="size-4 text-muted-foreground" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search apps" className="w-full bg-transparent text-sm outline-none" />
      </div>
      <div
        className="grid min-h-0 flex-1 grid-cols-4 content-start gap-x-3 gap-y-5 overflow-auto p-5"
        style={{ paddingBottom: "calc(var(--android-nav) + var(--sai-bottom))" }}
      >
        {list.map((a) => (
          <AppCell key={a.id} app={a} onClick={() => onLaunch(a)} />
        ))}
      </div>
    </div>
  );
}
