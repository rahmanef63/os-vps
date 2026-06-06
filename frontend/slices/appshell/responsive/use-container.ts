"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { Pane } from "./use-responsive";

// Container-width bucket — for the cases where a pane must reflow off its OWN
// width (not the viewport), and pure-CSS Tailwind `@container` variants aren't
// enough (e.g. JS branching on layout). Prefer `@container` in markup; reach for
// this only when you need the bucket in logic.
function bucket(w: number): Pane {
  if (w < 360) return "xs";
  if (w < 600) return "sm";
  if (w < 900) return "md";
  return "lg";
}

/**
 * Observe an element's width → size bucket. Usage:
 *   const [ref, pane] = useContainer<HTMLDivElement>();
 *   <div ref={ref} className={pane === "xs" ? …}>
 */
export function useContainer<T extends HTMLElement = HTMLElement>(): [
  RefObject<T | null>,
  Pane,
] {
  const ref = useRef<T>(null);
  const [pane, setPane] = useState<Pane>("lg");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? el.clientWidth;
      setPane(bucket(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, pane];
}
