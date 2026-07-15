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
      if (ref.current) ref.current.style.transition = "none"; // no geo-glide lag mid-drag
      const sx = e.clientX, sy = e.clientY;
      const ox = win.x, oy = win.y;
      let cx = sx, cy = sy, z: SnapZone | null = null;
      // Live drag runs on `transform` (compositor-only, no per-frame layout);
      // left/top stay frozen at win.x/win.y. dx/ndy hold the clamped delta so
      // pointerup commits win.x+dx / win.y+ndy — NOT offsetLeft: transform never
      // shifts the layout box, so offsetLeft would still read win.x and zero the drag.
      let dx = 0, ndy = 0;
      const apply = () => {
        raf.current = 0;
        dx = cx - sx;
        // clamp the absolute top to >=32 (under the menu bar), then back out the delta
        ndy = Math.max(32, oy + (cy - sy)) - oy;
        if (ref.current) ref.current.style.transform = `translate3d(${dx}px, ${ndy}px, 0)`;
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
        const el = ref.current;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        if (z) {
          if (el) { el.style.transform = ""; el.style.transition = ""; } // let it glide into the snap zone
          snapWindow(id, z);
        } else {
          // Atomic transform→left/top handoff. Clearing the transform reverts the
          // box to its frozen left/top (the drag origin); if .win-geo's transition
          // is live when the store then commits the NEW left/top, the window snaps
          // back to origin and glides forward (the reported glitch). So bake the
          // delta into the box's own inline left/top and drop the transform in the
          // SAME frame while transition is still "none", then re-arm .win-geo next
          // frame. moveWindow commits the identical numbers → the re-render is a
          // no-op and nothing animates. (Commit from the pointer delta, NOT
          // offsetLeft: the transform left the layout box at win.x.)
          if (el) {
            el.style.left = ox + dx + "px";
            el.style.top = oy + ndy + "px";
            el.style.transform = "";
            requestAnimationFrame(() => { if (ref.current) ref.current.style.transition = ""; });
          }
          moveWindow(id, ox + dx, oy + ndy);
        }
      };
      window.addEventListener("pointermove", move, { passive: true });
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
      if (ref.current) ref.current.style.transition = "none"; // no geo-glide lag mid-resize
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
        if (el) el.style.transition = ""; // restore the .win-geo glide
        if (el) {
          // offset* are relative to the desktop surface (the offset parent) —
          // the same space win.x/win.y live in. getBoundingClientRect is
          // viewport-relative and would add the surface's top offset (the macOS
          // menu bar's 30px) into win.y on every resize, drifting the window down.
          moveWindow(id, el.offsetLeft, el.offsetTop);
          resizeWindow(id, el.offsetWidth, el.offsetHeight);
        }
      };
      window.addEventListener("pointermove", move, { passive: true });
      window.addEventListener("pointerup", up);
    },
    [id, ref],
  );

  return { startDrag, startResize, zone };
}
