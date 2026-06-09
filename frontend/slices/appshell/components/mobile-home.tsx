"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AppDescriptor } from "../lib/types";
import { AppIcon } from "./app-icon";
import { Slot } from "../registry/feature-registry";
import { MobileAppLibrary } from "./mobile-app-library";
import { AppActionSheet, AppsGrid } from "./mobile-home-parts";

// Paged iPhone home: [Today widgets] · [App grid] · [App Library]. The dock,
// page dots, search pill and home-indicator persist across pages.
export function MobileHome({
  apps,
  dockApps,
  onLaunch,
  onSearch,
  onControlCenter,
  onNotifications,
  indicator,
}: {
  apps: AppDescriptor[];
  dockApps: AppDescriptor[];
  onLaunch: (app: AppDescriptor) => void;
  onSearch: () => void;
  onControlCenter: () => void;
  onNotifications?: () => void;
  indicator: React.ReactNode;
}) {
  const pagerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1); // 0 widgets · 1 apps · 2 library
  const [ctxApp, setCtxApp] = useState<AppDescriptor | null>(null); // long-press sheet

  // Open on the app grid (the middle page), like iPhone's default home.
  useLayoutEffect(() => {
    const el = pagerRef.current;
    if (el) el.scrollLeft = el.clientWidth;
  }, []);

  const onScroll = () => {
    const el = pagerRef.current;
    if (el) setPage(Math.round(el.scrollLeft / el.clientWidth));
  };

  // Swipe DOWN from the top safe-area: LEFT half → Notification Center,
  // RIGHT half → Control Center (iPhone's split gesture).
  const onTopPointerDown = (e: React.PointerEvent) => {
    const sy = e.clientY;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const left = e.clientX - rect.left < rect.width / 2;
    let fired = false;
    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", cleanup);
    };
    const move = (ev: PointerEvent) => {
      if (!fired && ev.clientY - sy > 40) {
        fired = true;
        cleanup();
        if (left && onNotifications) onNotifications();
        else onControlCenter();
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", cleanup);
  };

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* top safe area: Dynamic Island lives here; swipe down → NC (left) / CC (right).
          Height = base bar + the device notch inset so content never hides under it. */}
      <div
        className="shrink-0 [touch-action:none]"
        style={{ height: "calc(2.25rem + var(--sai-top))" }}
        onPointerDown={onTopPointerDown}
      />

      <div
        ref={pagerRef}
        onScroll={onScroll}
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <Page>
          <Slot region="today" />
        </Page>
        <Page>
          <AppsGrid apps={apps} onLaunch={onLaunch} onSearch={onSearch} onContext={setCtxApp} />
        </Page>
        <Page>
          <MobileAppLibrary apps={apps} onOpen={onLaunch} />
        </Page>
      </div>

      <div className="flex justify-center gap-1.5 pb-2 pt-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn("size-[7px] rounded-full", i === page ? "bg-white/90" : "bg-white/40")} />
        ))}
      </div>

      {dockApps.length > 0 && (
        <div
          className="glass mx-3 mb-3.5 flex justify-around rounded-[30px] border border-white/30 px-3.5 py-3"
          style={{ background: "rgba(255,255,255,.18)" }}
        >
          {dockApps.map((app) => (
            <Button key={app.id} type="button" variant="ghost" size="icon" aria-label={app.title} onClick={() => onLaunch(app)} className="h-auto w-auto hover:bg-transparent size-[60px] p-0">
              <AppIcon app={app} />
            </Button>
          ))}
        </div>
      )}

      {indicator}

      {ctxApp && (
        <AppActionSheet
          app={ctxApp}
          onOpen={() => { setCtxApp(null); onLaunch(ctxApp); }}
          onClose={() => setCtxApp(null)}
        />
      )}
    </div>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return <section className="h-full w-full shrink-0 snap-center overflow-hidden">{children}</section>;
}
