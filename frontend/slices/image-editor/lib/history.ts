"use client";

import { useCallback, useRef, useState } from "react";
import type { Doc } from "./types";

const LIMIT = 60;

// A single undoable step — either a whole-document change (layer add/move/style/
// transform/etc) OR a paint-pixel delta on one layer's offscreen canvas. Unifying
// both in ONE timeline is what makes brush/eraser strokes undoable alongside
// everything else (the v1 gap: paint pixels lived outside history).
export type HistAction =
  | { type: "doc"; before: Doc; after: Doc }
  | { type: "paint"; id: string; before: string; after: string };

export function useHistory(apply: {
  doc: (d: Doc) => void;
  paint: (id: string, dataUrl: string) => void;
}) {
  const past = useRef<HistAction[]>([]);
  const future = useRef<HistAction[]>([]);
  // Snapshot state instead of reading the refs during render (react-hooks/refs):
  // every mutation recomputes the flags, so renders never touch the refs.
  const [snap, setSnap] = useState({ rev: 0, canUndo: false, canRedo: false });
  const tick = () => {
    const canUndo = past.current.length > 0;
    const canRedo = future.current.length > 0;
    setSnap((s) => ({ rev: s.rev + 1, canUndo, canRedo }));
  };

  const push = useCallback((a: HistAction) => {
    past.current = [...past.current.slice(-(LIMIT - 1)), a];
    future.current = [];
    tick();
  }, []);

  const undo = useCallback(() => {
    const a = past.current.at(-1);
    if (!a) return;
    past.current = past.current.slice(0, -1);
    future.current = [a, ...future.current].slice(0, LIMIT);
    if (a.type === "doc") apply.doc(a.before);
    else apply.paint(a.id, a.before);
    tick();
  }, [apply]);

  const redo = useCallback(() => {
    const a = future.current[0];
    if (!a) return;
    future.current = future.current.slice(1);
    past.current = [...past.current, a].slice(-LIMIT);
    if (a.type === "doc") apply.doc(a.after);
    else apply.paint(a.id, a.after);
    tick();
  }, [apply]);

  // `rev` bumps on every change so the store can list it in its value-memo deps
  // → canUndo/canRedo stay reactive (recomputed on each mutation, see tick).
  return {
    push,
    undo,
    redo,
    rev: snap.rev,
    canUndo: snap.canUndo,
    canRedo: snap.canRedo,
  };
}
