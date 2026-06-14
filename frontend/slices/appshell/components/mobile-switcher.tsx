"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useWindowOrder, useWindow } from "../hooks/use-shell";
import { useSwipeUpClose } from "../hooks/use-swipe-close";
import { closeWindow, closeAll } from "../lib/store";
import { WindowPreview } from "./window-preview";

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
  onPick,
}: {
  winId: string;
  onPick: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Swipe-UP-to-close gesture (iPhone style) — shared with the Android recents.
  const { onPointerDown, draggedRef } = useSwipeUpClose(ref, () => closeWindow(winId));
  const win = useWindow(winId);
  if (!win) return null;
  // <WindowPreview variant="tile"> renders STATIC metadata (icon + title +
  // payload subline). Replaces the live <WindowContent> mount that used to
  // double every PTY/screencast session while the switcher was open
  // (AUDIT-2026-06-11 P1, Phase C of SHELL-FIDELITY-PLAN.md).
  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onClick={(e) => {
        e.stopPropagation(); // a card tap resumes; only empty space → home
        if (!draggedRef.current) onPick();
      }}
      style={{ touchAction: "pan-x" }}
      className="h-[66%] w-[74%] max-w-[300px] shrink-0 cursor-grab [scroll-snap-align:center]"
    >
      <WindowPreview
        winId={winId}
        aspect="9/16"
        variant="tile"
        onSelect={onPick}
        onClose={() => closeWindow(winId)}
      />
    </div>
  );
}
