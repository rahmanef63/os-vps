"use client";
/* iPhone-home sub-surfaces — the app grid page (upward-swipe search + long-press
   quick actions) and the haptic-touch action sheet. Split from mobile-home.tsx
   (≤200-LOC modularity gate). */
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import type { AppDescriptor } from "../lib/types";
import { AppIcon } from "./app-icon";

// Long-press quick-actions sheet (iPhone's haptic-touch menu): Open + whatever
// menu items the app declares for the macOS menu bar — one declaration, both OSes.
export function AppActionSheet({
  app, onOpen, onClose,
}: {
  app: AppDescriptor;
  onOpen: () => void;
  onClose: () => void;
}) {
  const items = (app.menus ?? []).flatMap((m) => m.items).filter(
    (it): it is Extract<typeof it, { label: string }> => !("sep" in it),
  );
  return (
    <div className="absolute inset-0 z-[45] flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" />
      <div
        className="relative mx-4 mb-6 overflow-hidden rounded-2xl bg-card/95 text-card-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <span className="size-9"><AppIcon app={app} /></span>
          <strong className="text-[15px]">{app.title}</strong>
        </div>
        <Button type="button" variant="ghost" onClick={onOpen} className="h-auto block w-full justify-start rounded-none px-4 py-3 text-left text-[15px] font-medium">
          Open
        </Button>
        {items.slice(0, 4).map((it, i) => (
          <Button
            key={i}
            type="button"
            variant="ghost"
            disabled={it.disabled}
            onClick={() => { onClose(); it.onSelect?.(); }}
            className="h-auto block w-full justify-start rounded-none border-t border-border px-4 py-3 text-left text-[15px]"
          >
            {it.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

// App grid page. A clear upward swipe (not a horizontal page flick) opens search;
// holding an icon ~450ms (or right-click) opens its quick-actions sheet.
export function AppsGrid({
  apps,
  onLaunch,
  onSearch,
  onContext,
}: {
  apps: AppDescriptor[];
  onLaunch: (app: AppDescriptor) => void;
  onSearch: () => void;
  onContext: (app: AppDescriptor) => void;
}) {
  // Long-press bookkeeping: a fired hold must swallow the click that follows.
  const holdTimer = useRef<number | null>(null);
  const held = useRef(false);

  const startHold = (app: AppDescriptor) => (e: React.PointerEvent) => {
    held.current = false;
    const sx = e.clientX, sy = e.clientY;
    const cancel = () => {
      if (holdTimer.current) { window.clearTimeout(holdTimer.current); holdTimer.current = null; }
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    const move = (ev: PointerEvent) => {
      if (Math.abs(ev.clientX - sx) > 12 || Math.abs(ev.clientY - sy) > 12) cancel();
    };
    const up = () => cancel();
    holdTimer.current = window.setTimeout(() => {
      held.current = true;
      cancel();
      onContext(app);
    }, 450);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const sy = e.clientY;
    const sx = e.clientX;
    let fired = false;
    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", cleanup);
    };
    const move = (ev: PointerEvent) => {
      const dy = ev.clientY - sy;
      const dx = ev.clientX - sx;
      if (!fired && dy < -70 && Math.abs(dx) < 50) {
        fired = true;
        cleanup();
        onSearch();
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", cleanup);
  };

  return (
    <div
      onPointerDown={onPointerDown}
      className="grid h-full grid-cols-4 content-start gap-x-2.5 gap-y-5 px-[18px] py-3.5 [touch-action:pan-x]"
    >
      {apps.map((app) => (
        <Button
          key={app.id}
          type="button"
          variant="ghost"
          onPointerDown={startHold(app)}
          onContextMenu={(e) => { e.preventDefault(); onContext(app); }}
          onClick={() => { if (held.current) { held.current = false; return; } onLaunch(app); }}
          className="h-auto p-0 hover:bg-transparent flex flex-col items-center gap-1.5"
        >
          <span className="aspect-square w-full max-w-[62px]">
            <AppIcon app={app} />
          </span>
          <span className="max-w-full truncate text-[11px] font-medium text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">
            {app.title}
          </span>
        </Button>
      ))}
    </div>
  );
}

