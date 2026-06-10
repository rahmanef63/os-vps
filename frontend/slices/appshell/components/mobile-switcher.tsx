"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useApps } from "../lib/registry";
import { useWindowOrder, useWindow } from "../hooks/use-shell";
import { useSwipeUpClose } from "../hooks/use-swipe-close";
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
      <div className="shrink-0" style={{ height: "calc(2.75rem + var(--sai-top))" }} />
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
        className="flex shrink-0 items-center justify-center gap-3 pt-2.5"
        style={{ paddingBottom: "calc(18px + var(--sai-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        {cards.length > 0 ? (
          <>
            <span className="text-[13px] text-white/70">Tap to open · ✕ or swipe up to close</span>
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
  // Swipe-UP-to-close gesture (iPhone style) — shared with the Android recents.
  const { onPointerDown, draggedRef } = useSwipeUpClose(ref, () => closeWindow(winId));
  const win = useWindow(winId);
  const app = win ? apps.find((a) => a.id === win.app) : null;
  if (!win || !app) return null;

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
        <strong className="flex-1 truncate text-[13px]">{app.title}</strong>
        {/* Explicit close — the swipe-up gesture is unreliable on Android PWA, so
            a tappable ✕ guarantees a way to kill a session on every platform. */}
        <button
          type="button"
          aria-label={`Close ${app.title}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation(); // don't let the card's onClick resume the app
            closeWindow(winId);
          }}
          className="-mr-1 flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/10 active:bg-foreground/20"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div className="pointer-events-none relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute inset-0 h-[143%] w-[143%] origin-top-left scale-[0.7]">
          <WindowContent app={win.app} payload={win.payload} />
        </div>
      </div>
    </div>
  );
}
