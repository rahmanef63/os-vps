"use client";

import { useCallback, useRef, useState } from "react";
import { ADJ_DEFAULT, FILTERS, type AdjustKey, type Adjustments } from "./filters";
import {
  INITIAL_LAYERS,
  createLayer,
  type Layer,
  type LayerKind,
  type ToolId,
} from "./model";

const HISTORY = 50;
const DEBOUNCE_MS = 400;

// In-memory studio store with a debounced undo + redo history (~400ms): rapid
// edits (drags, slider sweeps) coalesce into one undo step.
export function useStudio() {
  const [layers, setLayersRaw] = useState<Layer[]>(INITIAL_LAYERS);
  const [selected, setSelected] = useState<string | null>(INITIAL_LAYERS[0].id);
  const [adjustments, setAdjustments] = useState<Adjustments>(ADJ_DEFAULT);
  const [activeFilter, setActiveFilter] = useState("Original");
  const [past, setPast] = useState<Layer[][]>([]);
  const [future, setFuture] = useState<Layer[][]>([]);
  const lastPush = useRef(0);

  // Apply an update; push the prior state onto the undo stack unless the last
  // push was within the debounce window (then it coalesces). `force` always pushes.
  const setLayers = useCallback(
    (next: Layer[] | ((p: Layer[]) => Layer[]), force = false) => {
      setLayersRaw((prev) => {
        const now = Date.now();
        if (force || now - lastPush.current > DEBOUNCE_MS) {
          setPast((p) => [...p.slice(-(HISTORY - 1)), prev]);
          setFuture([]);
        }
        lastPush.current = now;
        return typeof next === "function" ? next(prev) : next;
      });
    },
    [],
  );

  // Force the next setLayers to start a fresh undo step (call before a drag).
  const commit = useCallback(() => {
    lastPush.current = 0;
  }, []);

  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      setLayersRaw((cur) => {
        setFuture((f) => [cur, ...f].slice(0, HISTORY));
        return p[p.length - 1];
      });
      lastPush.current = Date.now();
      return p.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      setLayersRaw((cur) => {
        setPast((p) => [...p, cur].slice(-HISTORY));
        return f[0];
      });
      lastPush.current = Date.now();
      return f.slice(1);
    });
  }, []);

  const update = useCallback(
    (id: string, patch: Partial<Layer>) =>
      setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l))),
    [setLayers],
  );

  const toggle = useCallback(
    (id: string) =>
      setLayers((ls) =>
        ls.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
      ),
    [setLayers],
  );

  const reorder = useCallback(
    (id: string, dir: -1 | 1) =>
      setLayers((ls) => {
        const i = ls.findIndex((l) => l.id === id);
        const j = i + dir;
        if (j < 0 || j >= ls.length) return ls;
        const a = [...ls];
        [a[i], a[j]] = [a[j], a[i]];
        return a;
      }, true),
    [setLayers],
  );

  const remove = useCallback(
    (id: string) => {
      setLayers((ls) => ls.filter((l) => l.id !== id), true);
      setSelected((s) => (s === id ? null : s));
    },
    [setLayers],
  );

  const add = useCallback(
    (kind: LayerKind, extra: Partial<Layer> = {}) => {
      const l = createLayer(kind, extra);
      setLayers((ls) => [l, ...ls], true);
      setSelected(l.id);
      return l;
    },
    [setLayers],
  );

  // Replace the whole stack from an imported doc (one undo step).
  const loadLayers = useCallback(
    (next: Layer[]) => {
      setLayers(next, true);
      setSelected(next[0]?.id ?? null);
    },
    [setLayers],
  );

  // Place a layer at canvas-% coords based on the active tool.
  const place = useCallback(
    (tool: ToolId, x: number, y: number) => {
      if (tool === "text") add("text", { x, y });
      else if (tool === "rect") add("shape", { x, y, shape: "rect", name: "Rectangle" });
      else if (tool === "ellipse")
        add("shape", { x, y, shape: "ellipse", name: "Ellipse" });
    },
    [add],
  );

  const adjust = useCallback((key: AdjustKey, value: number) => {
    setAdjustments((a) => ({ ...a, [key]: value }));
    setActiveFilter("—");
  }, []);

  const applyFilter = useCallback((name: string) => {
    const f = FILTERS.find((x) => x.name === name) ?? FILTERS[0];
    setAdjustments({ ...ADJ_DEFAULT, ...f.a });
    setActiveFilter(f.name);
  }, []);

  const resetAdjust = useCallback(() => {
    setAdjustments(ADJ_DEFAULT);
    setActiveFilter("Original");
  }, []);

  return {
    layers,
    selected,
    adjustments,
    activeFilter,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    setSelected,
    setLayers,
    setAdjustments,
    setActiveFilter,
    commit,
    undo,
    redo,
    update,
    toggle,
    reorder,
    remove,
    add,
    loadLayers,
    place,
    adjust,
    applyFilter,
    resetAdjust,
  };
}
