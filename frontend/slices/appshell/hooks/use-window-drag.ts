"use client";

import { useCallback, useRef, useState, type RefObject } from "react";
import {
  shellStore,
  moveWindow,
  resizeWindow,
  focusWindow,
  toggleMaximize,
  snapWindow,
  snapZoneAt,
} from "../lib/store";
import type { WinId, SnapZone } from "../lib/types";

type ResizeDir = "l" | "r" | "b" | "br";

// Writes geometry straight to the element's style during the gesture (no React
// state per frame, no desktop re-render) and commits the final rect to the
// store on pointer-up. Mirrors os-rr's rAF drag for a 60fps feel.
export function useWindowDrag(id: WinId, ref: RefObject<HTMLDivElement | null>) {
  const [zone, setZone] = useState<SnapZone | null>(null);
  const raf = useRef(0);

  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const win = shellStore.getWindow(id);
      if (!win) return;
      focusWindow(id);
      if (win.maximized) toggleMaximize(id);
      const sx = e.clientX, sy = e.clientY;
      const ox = win.x, oy = win.y;
      let cx = sx, cy = sy, z: SnapZone | null = null;
      const apply = () => {
        raf.current = 0;
        const nx = ox + (cx - sx);
        const ny = Math.max(32, oy + (cy - sy));
        if (ref.current) {
          ref.current.style.left = nx + "px";
          ref.current.style.top = ny + "px";
        }
        z = snapZoneAt(cx, cy);
        setZone(z);
      };
      const move = (ev: PointerEvent) => {
        cx = ev.clientX; cy = ev.clientY;
        if (!raf.current) raf.current = requestAnimationFrame(apply);
      };
      const up = () => {
        cancelAnimationFrame(raf.current); raf.current = 0;
        setZone(null);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        if (z) snapWindow(id, z);
        else if (ref.current) {
          // offsetLeft/Top are relative to the desktop surface (the offset
          // parent) — the same space win.x/win.y live in. getBoundingClientRect
          // is viewport-relative and would add the surface's top offset each drop.
          moveWindow(id, ref.current.offsetLeft, ref.current.offsetTop);
        }
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [id, ref],
  );

  const startResize = useCallback(
    (e: React.PointerEvent, dir: ResizeDir) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      const win = shellStore.getWindow(id);
      if (!win) return;
      focusWindow(id);
      const sx = e.clientX, sy = e.clientY;
      const ow = win.w, oh = win.h, ox = win.x;
      let cx = sx, cy = sy;
      const apply = () => {
        raf.current = 0;
        let w = ow, h = oh, x = ox;
        if (dir.includes("r")) w = Math.max(300, ow + (cx - sx));
        if (dir.includes("b")) h = Math.max(200, oh + (cy - sy));
        if (dir.includes("l")) { w = Math.max(300, ow - (cx - sx)); x = ox + (ow - w); }
        const el = ref.current;
        if (el) { el.style.width = w + "px"; el.style.height = h + "px"; el.style.left = x + "px"; }
      };
      const move = (ev: PointerEvent) => {
        cx = ev.clientX; cy = ev.clientY;
        if (!raf.current) raf.current = requestAnimationFrame(apply);
      };
      const up = () => {
        cancelAnimationFrame(raf.current); raf.current = 0;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        const el = ref.current;
        if (el) {
          const r = el.getBoundingClientRect();
          moveWindow(id, r.left, r.top);
          resizeWindow(id, r.width, r.height);
        }
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [id, ref],
  );

  return { startDrag, startResize, zone };
}
