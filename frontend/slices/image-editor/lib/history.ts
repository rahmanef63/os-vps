"use client";

import { useCallback, useRef, useState } from "react";
import type { Doc } from "./types";

const LIMIT = 60;

// A single undoable step — either a whole-document change (layer add/move/style/
// transform/etc) OR a paint-pixel delta on one layer's offscreen canvas. Unifying
// both in ONE timeline is what makes brush/eraser strokes undoable alongside
// everything else (the v1 gap: paint pixels lived outside history).
// Paint snapshots are blob: URLs (canvas.toBlob → URL.createObjectURL) — Blobs
// share memory pages, so 60 strokes on a big canvas cost a fraction of the
// equivalent 60 base64 data URLs the v1 stack carried in JS heap.
export type HistAction =
  | { type: "doc"; before: Doc; after: Doc }
  | { type: "paint"; id: string; before: string; after: string };

// Revoke any blob: URL referenced by a paint action — the browser holds the
// underlying Blob alive as long as ANY URL handle exists, so dropping the
// action without revoking is a real leak. doc actions reference no URLs.
function revoke(a: HistAction | undefined) {
  if (!a || a.type !== "paint") return;
  for (const u of [a.before, a.after]) {
    if (u && u.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(u);
      } catch {
        /* ignore */
      }
    }
  }
}

export function useHistory(apply: {
  doc: (d: Doc) => void;
  paint: (id: string, url: string) => void;
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
    // Past overflows → revoke evicted entries' blob URLs.
    if (past.current.length >= LIMIT) {
      const drop = past.current.length - (LIMIT - 1);
      for (let i = 0; i < drop; i++) revoke(past.current[i]);
    }
    past.current = [...past.current.slice(-(LIMIT - 1)), a];
    // New action invalidates the future — revoke each abandoned paint step.
    for (const f of future.current) revoke(f);
    future.current = [];
    tick();
  }, []);

  const undo = useCallback(() => {
    const a = past.current.at(-1);
    if (!a) return;
    past.current = past.current.slice(0, -1);
    if (future.current.length >= LIMIT) revoke(future.current[future.current.length - 1]);
    future.current = [a, ...future.current].slice(0, LIMIT);
    if (a.type === "doc") apply.doc(a.before);
    else apply.paint(a.id, a.before);
    tick();
  }, [apply]);

  const redo = useCallback(() => {
    const a = future.current[0];
    if (!a) return;
    future.current = future.current.slice(1);
    if (past.current.length >= LIMIT) revoke(past.current[0]);
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
