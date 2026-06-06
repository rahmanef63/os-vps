"use client";

import { useCallback } from "react";
import type { Layer } from "./types";

// A layer mask is a DOC-ALIGNED alpha buffer (opaque white = visible, transparent
// = hidden), stored in the editor's canvas map under this key. The masked layer
// is rendered through it via destination-in compositing (see masked-group.tsx).
export const maskKey = (id: string) => `${id}::mask`;

// Fresh mask = fully opaque (nothing hidden yet).
export function initMaskCanvas(c: HTMLCanvasElement) {
  const ctx = c.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, c.width, c.height);
}

type Ops = {
  canvasFor: (id: string, w: number, h: number) => HTMLCanvasElement;
  canvases: React.MutableRefObject<Map<string, HTMLCanvasElement>>;
  update: (id: string, patch: Partial<Layer>) => void;
  docSize: () => { w: number; h: number };
  setMaskEdit: (id: string | null) => void;
};

// add/removeMask each call update() (a tracked doc step), so the masked-group
// re-caches off the shared history `version` — no separate mask revision needed.
export function useMaskOps({ canvasFor, canvases, update, docSize, setMaskEdit }: Ops) {
  // Adding a mask does NOT enter mask-edit — otherwise the brush would silently
  // paint the (hiding) mask instead of the layer. Editing the mask is a deliberate
  // toggle (the dashed-square button / "Edit mask" menu item).
  const addMask = useCallback((id: string) => {
    const { w, h } = docSize();
    initMaskCanvas(canvasFor(maskKey(id), w, h));
    update(id, { mask: true });
  }, [canvasFor, docSize, update]);

  const removeMask = useCallback((id: string) => {
    canvases.current.delete(maskKey(id));
    update(id, { mask: false });
    setMaskEdit(null);
  }, [canvases, update, setMaskEdit]);

  return { addMask, removeMask };
}
