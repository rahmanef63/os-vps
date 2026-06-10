"use client";

import { useRef, type RefObject, type PointerEvent as ReactPointerEvent } from "react";

/* Swipe-UP-to-close gesture shared by the iOS switcher and the Android
   recents deck. Pointer handlers drive ONLY the dismiss gesture; tap-to-open
   stays on onClick — the canonical tap signal, which fires reliably on touch
   even when a synthetic pointerup is swallowed by the scroll container.
   Returns the pointerdown handler plus draggedRef: set while/just-after an
   upward drag so the trailing click doesn't also pick the card. */
export function useSwipeUpClose(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  const draggedRef = useRef(false);

  const onPointerDown = (e: ReactPointerEvent) => {
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
    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    const up = (ev: PointerEvent) => {
      cleanup();
      const dy = ev.clientY - sy;
      if (dragging && dy < -90) {
        if (card) {
          card.style.transition = "transform .2s, opacity .2s";
          card.style.transform = "translateY(-110%)";
          card.style.opacity = "0";
        }
        setTimeout(onClose, 180);
        return;
      }
      if (card) {
        card.style.transition = "transform .22s, opacity .22s";
        card.style.transform = "";
        card.style.opacity = "";
      }
      // Released without crossing the close threshold: snap back. A clean tap
      // (draggedRef still false) falls through to onClick; a partial drag
      // leaves draggedRef set so its trailing click is ignored. The next
      // pointerdown resets the flag.
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    // Android Chrome fires pointercancel (not pointerup) when its scroll/gesture
    // arbiter claims the touch — without this the swipe-up close silently no-ops
    // (worked on iOS, dead on Android). Treat cancel as a release: snap back.
    window.addEventListener("pointercancel", up);
  };

  return { onPointerDown, draggedRef };
}
