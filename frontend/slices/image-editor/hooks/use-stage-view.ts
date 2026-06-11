"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEditor } from "../lib/store";
import type { Pan } from "../lib/types";

const MIN = 0.05;
const MAX = 8;
const MARGIN = 64; // px of the doc that must stay on-screen (can't lose the canvas)
const clampZoom = (z: number) => Math.min(MAX, Math.max(MIN, z));

// Canvas navigation (Photoshop-like): wheel zoom-to-cursor, hand/space drag-pan,
// pinch, fit-to-screen, 100%, AND pan is clamped so the document can never fully
// leave the viewport. Auto-refits when the doc size changes; re-clamps on
// container resize. ⌘0 = Fit, ⌘1 = 100%.
export function useStageView(size: { w: number; h: number }) {
  const { doc, zoom, pan, tool, setZoom, setPan, rootRef } = useEditor();
  const [space, setSpace] = useState(false);
  const lastDoc = useRef("");
  const pinch = useRef<{ dist: number } | null>(null);
  const panMode = tool === "hand" || space;

  const clampPan = useCallback((p: Pan, z: number): Pan => {
    const dw = doc.width * z, dh = doc.height * z;
    return {
      x: Math.min(size.w - MARGIN, Math.max(MARGIN - dw, p.x)),
      y: Math.min(size.h - MARGIN, Math.max(MARGIN - dh, p.y)),
    };
  }, [doc.width, doc.height, size.w, size.h]);

  const centerAt = useCallback((z: number) => ({ x: (size.w - doc.width * z) / 2, y: (size.h - doc.height * z) / 2 }), [size.w, size.h, doc.width, doc.height]);

  const fit = useCallback(() => {
    if (!size.w || !size.h) return;
    const z = clampZoom(Math.min(size.w / doc.width, size.h / doc.height) * 0.9);
    setZoom(z);
    setPan(centerAt(z));
  }, [size.w, size.h, doc.width, doc.height, setZoom, setPan, centerAt]);

  const center100 = useCallback(() => { setZoom(1); setPan(centerAt(1)); }, [setZoom, setPan, centerAt]);

  // Fit on first measure AND whenever the doc dimensions change (new/crop/aspect).
  useEffect(() => {
    if (!size.w || !size.h) return;
    const key = `${doc.width}x${doc.height}`;
    if (lastDoc.current !== key) { lastDoc.current = key; fit(); }
  }, [size.w, size.h, doc.width, doc.height, fit]);

  // On container resize (e.g. the side panel mounting, or the window resizing):
  // re-CENTER the doc if it fully fits the new viewport (so it never ends up
  // stuck off to one side), otherwise just clamp so a zoomed-in pan is preserved.
  useEffect(() => {
    if (!size.w || !size.h) return;
    const fits = doc.width * zoom <= size.w && doc.height * zoom <= size.h;
    setPan(fits ? centerAt(zoom) : clampPan(pan, zoom));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, size.h]);

  useEffect(() => {
    const typing = () => ["input", "textarea"].includes((document.activeElement?.tagName ?? "").toLowerCase());
    // Only handle nav keys when focus is inside THIS editor — otherwise Space was
    // swallowed OS-wide (e.g. it scrolls / activates buttons in another window).
    const inEditor = () => { const r = rootRef.current; return !!r && r.contains(document.activeElement); };
    const down = (e: KeyboardEvent) => {
      if (!inEditor()) return;
      if (e.code === "Space" && !typing()) { e.preventDefault(); setSpace(true); }
      else if ((e.metaKey || e.ctrlKey) && e.key === "0") { e.preventDefault(); fit(); }
      else if ((e.metaKey || e.ctrlKey) && e.key === "1") { e.preventDefault(); center100(); }
    };
    const up = (e: KeyboardEvent) => { if (e.code === "Space") setSpace(false); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [fit, center100, rootRef]);

  const zoomTo = useCallback((nextZoom: number, px: number, py: number) => {
    const z2 = clampZoom(nextZoom);
    const inDocX = (px - pan.x) / zoom, inDocY = (py - pan.y) / zoom;
    setZoom(z2);
    setPan(clampPan({ x: px - inDocX * z2, y: py - inDocY * z2 }, z2));
  }, [zoom, pan.x, pan.y, setZoom, setPan, clampPan]);

  const onWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const p = e.target.getStage()?.getPointerPosition();
    if (p) zoomTo(zoom * (e.evt.deltaY > 0 ? 0.92 : 1.08), p.x, p.y);
  }, [zoom, zoomTo]);

  const onTouchMove = useCallback((e: KonvaEventObject<TouchEvent>) => {
    const t = e.evt.touches;
    if (t.length !== 2) return;
    e.evt.preventDefault();
    const rect = e.target.getStage()?.container().getBoundingClientRect();
    const cx = (t[0].clientX + t[1].clientX) / 2 - (rect?.left ?? 0);
    const cy = (t[0].clientY + t[1].clientY) / 2 - (rect?.top ?? 0);
    const dist = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    if (pinch.current) zoomTo(zoom * (dist / pinch.current.dist), cx, cy);
    pinch.current = { dist };
  }, [zoom, zoomTo]);

  const onTouchEnd = useCallback(() => { pinch.current = null; }, []);

  return { panMode, fit, center100, clampPan, onWheel, onTouchMove, onTouchEnd, zoomTo };
}
