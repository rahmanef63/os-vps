"use client";

import type { RefObject, PointerEvent as ReactPointerEvent } from "react";

/* Pull-DOWN gesture (Android quick-settings shade). Same hardening as the
   other shell gestures: fires AT the threshold during move (robust against
   pointercancel — Android Chrome reclaims touches mid-gesture), and an
   optional scrollRef keeps a scrollable child working: the pull only arms
   when that element is at its top. */
export function usePullDown(
  onPull: () => void,
  scrollRef?: RefObject<HTMLElement | null>,
): (e: ReactPointerEvent) => void {
  return (e: ReactPointerEvent) => {
    const scroller = scrollRef?.current;
    if (scroller && scroller.contains(e.target as Node) && scroller.scrollTop > 0) return;
    const sx = e.clientX;
    const sy = e.clientY;
    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      if (dy > 60 && dy > Math.abs(dx)) {
        cleanup();
        onPull();
      }
    };
    const end = () => cleanup();
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };
}
