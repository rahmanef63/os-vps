"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useApps } from "../lib/registry";
import { useWindowOrder, useWindow } from "../hooks/use-shell";
import { closeWindow, closeAll } from "../lib/store";
import { AppIcon } from "./app-icon";
import { WindowContent } from "./window-content";

// iOS-style app switcher: horizontally-scrolling cards of open windows
// (most-recent first via reversed window order). Tap a card to focus it,
// hold + swipe a card UP (> ~90px) to close (matches the real iPhone). A
// "Close All" button clears every window. Tap the backdrop to dismiss.
export function MobileSwitcher({
  onPick,
  onHome,
}: {
  onPick: (winId: string) => void;
  /** Tap empty space (backdrop) or Close All → return to the home screen. */
  onHome: () => void;
}) {
  const apps = useApps();
  const order = useWindowOrder();
  const cards = [...order].reverse();

  return (
    <div
      onClick={onHome}
      className="glass absolute inset-0 z-[40] flex flex-col bg-black/55"
    >
      <div className="h-11 shrink-0" />
      <div className="flex min-h-0 flex-1 items-center gap-3.5 overflow-x-auto px-8 [scroll-snap-type:x_proximity]">
        {cards.length === 0 && (
          <div className="w-full text-center text-sm text-white/60">
            No open apps
          </div>
        )}
        {cards.map((id) => (
          <SwitcherCard
            key={id}
            winId={id}
            apps={apps}
            onPick={() => onPick(id)}
          />
        ))}
      </div>
      <div
        className="flex shrink-0 items-center justify-center gap-3 py-2.5 pb-[18px]"
        onClick={(e) => e.stopPropagation()}
      >
        {cards.length > 0 ? (
          <>
            <span className="text-[13px] text-white/70">Tap to open · swipe up to close</span>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                closeAll();
                onHome();
              }}
              className="h-auto rounded-full bg-white/15 px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-white/25"
            >
              Close All
            </Button>
          </>
        ) : (
          <span className="text-[13px] text-white/50">No open apps</span>
        )}
      </div>
    </div>
  );
}

function SwitcherCard({
  winId,
  apps,
  onPick,
}: {
  winId: string;
  apps: ReturnType<typeof useApps>;
  onPick: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Set while/just-after an upward drag so the trailing click doesn't also pick.
  const draggedRef = useRef(false);
  const win = useWindow(winId);
  const app = win ? apps.find((a) => a.id === win.app) : null;
  if (!win || !app) return null;

  // Pointer handlers drive ONLY the swipe-UP-to-close gesture (iPhone style).
  // Tapping to open is handled by onClick — the canonical tap signal, which
  // fires reliably on touch even when a synthetic pointerup is swallowed by the
  // scroll container.
  const onPointerDown = (e: React.PointerEvent) => {
    const card = ref.current;
    const sy = e.clientY;
    const sx = e.clientX;
    const DRAG_START = 8; // px upward before it counts as a drag
    draggedRef.current = false;
    let dragging = false;
    const move = (ev: PointerEvent) => {
      const dy = ev.clientY - sy;
      const dx = ev.clientX - sx;
      if (!dragging) {
        if (Math.abs(dx) > Math.abs(dy)) return; // horizontal → let the row scroll
        if (dy > -DRAG_START) return; // not a deliberate upward drag yet
        dragging = true;
        draggedRef.current = true;
      }
      if (card) {
        const up = Math.min(dy, 0);
        card.style.transition = "none";
        card.style.transform = `translateY(${up}px)`;
        card.style.opacity = `${1 - Math.min(-up, 300) / 400}`;
      }
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const dy = ev.clientY - sy;
      if (dragging && dy < -90) {
        if (card) {
          card.style.transition = "transform .2s, opacity .2s";
          card.style.transform = "translateY(-110%)";
          card.style.opacity = "0";
        }
        setTimeout(() => closeWindow(winId), 180);
        return;
      }
      if (card) {
        card.style.transition = "transform .22s, opacity .22s";
        card.style.transform = "";
        card.style.opacity = "";
      }
      // Released without crossing the close threshold: snap back. A clean tap
      // (draggedRef still false) falls through to onClick → onPick; a partial
      // drag leaves draggedRef set so its trailing click is ignored. The next
      // pointerdown resets the flag.
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onClick={(e) => {
        e.stopPropagation(); // a card tap resumes; only empty space → home
        if (!draggedRef.current) onPick();
      }}
      style={{ background: "var(--window-bg)", touchAction: "pan-x" }}
      className="flex h-[66%] w-[74%] max-w-[300px] shrink-0 cursor-grab flex-col overflow-hidden rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] [scroll-snap-align:center]"
    >
      <div
        className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5"
        style={{ background: "var(--glass-bar)" }}
      >
        <span className="size-6">
          <AppIcon app={app} />
        </span>
        <strong className="text-[13px]">{app.title}</strong>
      </div>
      <div className="pointer-events-none relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute inset-0 h-[143%] w-[143%] origin-top-left scale-[0.7]">
          <WindowContent app={win.app} payload={win.payload} />
        </div>
      </div>
    </div>
  );
}
