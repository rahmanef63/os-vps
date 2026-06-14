"use client";

// Viewport-windowing for big lists. NO deps. Renders only rows in the visible
// slice + a small overscan; the rest of the list is reserved as empty space via
// a sized spacer. Threshold-gated by the caller (we always windowize, but for
// short lists start=0/end=N so behavior is identical to "render all").
//
// Pattern: caller passes a ref to a spacer div sized to (totalHeight). Inside,
// the visible slice is absolutely positioned at offsetTop. The hook listens to
// the spacer's nearest scrollable ancestor + window resize.
import { useEffect, useState, type RefObject } from "react";

export interface ViewportWindow {
  /** Inclusive first index that should be mounted. */
  start: number;
  /** Exclusive last index (so callers can `slice(start, end)`). */
  end: number;
  /** Translate-Y for the rendered slice so it lines up under the scroll. */
  offsetTop: number;
  /** Reserved scrollable space — keeps the scrollbar honest. */
  totalHeight: number;
}

// PURE — no DOM, no React. Single source of truth for the math; the React hook
// just wires inputs (scrollTop, viewportHeight) to it.
export function computeViewportWindow(input: {
  scrollTop: number;
  viewportHeight: number;
  rowHeight: number;
  total: number;
  overscan?: number;
}): ViewportWindow {
  const { scrollTop, viewportHeight, rowHeight, total } = input;
  const overscan = input.overscan ?? 5;
  if (total <= 0 || rowHeight <= 0) return { start: 0, end: 0, offsetTop: 0, totalHeight: 0 };
  const totalHeight = total * rowHeight;
  // Clamp scrollTop to avoid negative offsets when the spacer is below the viewport top.
  const clampedTop = Math.max(0, scrollTop);
  const rawStart = Math.floor(clampedTop / rowHeight);
  const rawEnd = Math.ceil((clampedTop + Math.max(0, viewportHeight)) / rowHeight);
  const start = Math.max(0, rawStart - overscan);
  const end = Math.min(total, rawEnd + overscan);
  const offsetTop = start * rowHeight;
  return { start, end, offsetTop, totalHeight };
}

function findScrollAncestor(el: HTMLElement | null): HTMLElement | null {
  let node: HTMLElement | null = el?.parentElement ?? null;
  while (node) {
    const style = getComputedStyle(node);
    if (/(auto|scroll|overlay)/.test(style.overflowY)) return node;
    node = node.parentElement;
  }
  return null;
}

// React side. Reads scroll position + viewport height from the nearest scrolling
// ancestor of `containerRef.current` (typically the Radix ScrollArea viewport).
// Falls back to window if no scroll ancestor is found.
export function useViewportWindow<T>(
  items: T[] | readonly T[],
  opts: {
    rowHeight: number;
    overscan?: number;
    /** Ref to the SPACER element (the absolutely-positioned host for the slice). */
    containerRef: RefObject<HTMLElement | null>;
  },
): ViewportWindow {
  const { rowHeight, overscan, containerRef } = opts;
  const total = items.length;
  const [win, setWin] = useState<ViewportWindow>(() =>
    computeViewportWindow({ scrollTop: 0, viewportHeight: 0, rowHeight, total, overscan }),
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const scroller = findScrollAncestor(el);
    const recompute = () => {
      const viewportHeight = scroller ? scroller.clientHeight : window.innerHeight;
      // Spacer's top relative to the scroller; subtract so scrollTop maps to a
      // position inside the spacer (negative when the spacer is below the fold).
      let scrollTop = 0;
      if (scroller) {
        const elBox = el.getBoundingClientRect();
        const scBox = scroller.getBoundingClientRect();
        scrollTop = scBox.top - elBox.top;
      } else {
        const elBox = el.getBoundingClientRect();
        scrollTop = -elBox.top;
      }
      setWin(computeViewportWindow({ scrollTop, viewportHeight, rowHeight, total, overscan }));
    };
    recompute();
    const target: EventTarget = scroller ?? window;
    target.addEventListener("scroll", recompute, { passive: true });
    window.addEventListener("resize", recompute);
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined" && scroller) {
      ro = new ResizeObserver(recompute);
      ro.observe(scroller);
    }
    return () => {
      target.removeEventListener("scroll", recompute);
      window.removeEventListener("resize", recompute);
      ro?.disconnect();
    };
  }, [containerRef, rowHeight, total, overscan]);

  return win;
}
