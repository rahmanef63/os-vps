"use client";

import { useCallback } from "react";
import type { Doc, Layer } from "./types";
import { createLayer } from "./model";

type SetDoc = (next: Doc | ((d: Doc) => Doc), track?: boolean) => void;

// Layer-array operations (add/remove/duplicate/reorder/raise/lower) + canvas
// size, factored out of the store to keep store.tsx under the 200-LOC cap. All
// route through `setDoc` so they share immutability + the undo timeline.
export function useDocOps(
  setDoc: SetDoc,
  canvases: React.MutableRefObject<Map<string, HTMLCanvasElement>>,
  setSelectedId: (id: string | null | ((s: string | null) => string | null)) => void,
) {
  const addLayer = useCallback((layer: Layer, opts?: { select?: boolean }) => {
    setDoc((d) => ({ ...d, layers: [...d.layers, layer] }));
    if (opts?.select !== false) setSelectedId(layer.id);
  }, [setDoc, setSelectedId]);

  const removeLayer = useCallback((id: string) => {
    canvases.current.delete(id);
    setDoc((d) => ({ ...d, layers: d.layers.filter((l) => l.id !== id) }));
    setSelectedId((s) => (s === id ? null : s));
  }, [setDoc, canvases, setSelectedId]);

  const duplicateLayer = useCallback((id: string) => {
    setDoc((d) => {
      const i = d.layers.findIndex((l) => l.id === id);
      if (i < 0) return d;
      const src = d.layers[i];
      const copy = createLayer(src.kind, { ...src, name: `${src.name} copy`, t: { ...src.t, x: src.t.x + 24, y: src.t.y + 24 } });
      return { ...d, layers: [...d.layers.slice(0, i + 1), copy, ...d.layers.slice(i + 1)] };
    });
  }, [setDoc]);

  const reorder = useCallback((from: number, to: number) => {
    setDoc((d) => {
      const ls = [...d.layers];
      const [m] = ls.splice(from, 1);
      ls.splice(to, 0, m);
      return { ...d, layers: ls };
    });
  }, [setDoc]);

  const move = useCallback((id: string, dir: 1 | -1) => {
    setDoc((d) => {
      const i = d.layers.findIndex((l) => l.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.layers.length) return d;
      const ls = [...d.layers];
      [ls[i], ls[j]] = [ls[j], ls[i]];
      return { ...d, layers: ls };
    });
  }, [setDoc]);

  const setDocSize = useCallback((w: number, h: number) => setDoc((d) => ({ ...d, width: w, height: h })), [setDoc]);

  // Crop: resize the doc to (w,h) anchored at (x,y), shift every layer by (-x,-y),
  // and re-bake each paint layer's pixels into a new (w,h) canvas at the offset.
  const applyCrop = useCallback((x: number, y: number, w: number, h: number) => {
    setDoc((d) => {
      for (const l of d.layers) {
        if (l.kind !== "paint") continue;
        const old = canvases.current.get(l.id);
        if (!old) continue;
        const nc = document.createElement("canvas");
        nc.width = w;
        nc.height = h;
        nc.getContext("2d")?.drawImage(old, -x, -y);
        canvases.current.set(l.id, nc);
      }
      return {
        ...d,
        width: Math.round(w),
        height: Math.round(h),
        layers: d.layers.map((l) => ({ ...l, t: { ...l.t, x: l.t.x - x, y: l.t.y - y } })),
      };
    });
  }, [setDoc, canvases]);

  return { addLayer, removeLayer, duplicateLayer, reorder, raise: (id: string) => move(id, 1), lower: (id: string) => move(id, -1), setDocSize, applyCrop };
}
