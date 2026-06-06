"use client";

import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEditor } from "../lib/store";
import { contentBBox } from "../lib/bbox";

type AnyNode = Konva.Node | null;

// Stage selection / pointer wiring: the Move-tool Transformer attachment, the
// paint-layer content bbox (the move box that hugs drawn pixels), background
// pointer-down (deselect / eyedropper), double-click (text edit / shape color),
// and the hidden native color picker. Pure interaction state extracted from
// <EditorStage>; behaviour is unchanged.
export function useStageInteractions(panMode: boolean) {
  const { doc, tool, selectedId, select, setFg, update, maskEditId, canvasFor, version } = useEditor();
  const [editId, setEditId] = useState<string | null>(null);
  // Content bbox (doc coords) of the selected PAINT layer — drives a move box that
  // hugs the drawn pixels (null = empty layer → no box).
  const [paintBox, setPaintBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const colorInput = useRef<HTMLInputElement | null>(null);
  const colorTarget = useRef<string | null>(null);
  const nodes = useRef<Map<string, AnyNode>>(new Map());
  const boxRef = useRef<Konva.Rect | null>(null);
  const trRef = useRef<Konva.Transformer | null>(null);
  const selected = doc.layers.find((l) => l.id === selectedId) ?? null;

  // The Move box hugs the OBJECT: shapes/text/images use their own (content-sized)
  // node with full resize+rotate; paint layers use a proxy fitted to the painted
  // pixels (move-only); an empty layer (no content node / no pixels) shows nothing.
  useEffect(() => {
    const tr = trRef.current;
    if (!tr || tool !== "move" || !selected || selected.locked) {
      tr?.nodes([]);
      tr?.getLayer()?.batchDraw();
      return;
    }
    if (selected.kind === "paint") {
      tr.resizeEnabled(false);
      tr.rotateEnabled(false);
      tr.nodes(boxRef.current ? [boxRef.current] : []);
    } else {
      const sel = nodes.current.get(selected.id);
      tr.resizeEnabled(true);
      tr.rotateEnabled(true);
      tr.nodes(sel ? [sel] : []);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedId, tool, doc.layers, paintBox, selected]);

  // Recompute the paint content bbox only while it matters (Move tool + paint).
  useEffect(() => {
    if (tool === "move" && selected?.kind === "paint") {
      setPaintBox(contentBBox(canvasFor(selected.id, doc.width, doc.height)));
    } else {
      setPaintBox(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, tool, version, doc.width, doc.height]);

  const hex = (n: number) => n.toString(16).padStart(2, "0");
  const onBgDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (panMode) return;
    if (tool === "eyedropper") {
      const stage = e.target.getStage();
      const p = stage?.getPointerPosition();
      if (!stage || !p) return;
      // pixelRatio:1 → output px match CSS pointer coords.
      const ctx = stage.toCanvas({ pixelRatio: 1 }).getContext("2d");
      const d = ctx?.getImageData(Math.round(p.x), Math.round(p.y), 1, 1).data;
      if (d && d[3] > 0) setFg(`#${hex(d[0])}${hex(d[1])}${hex(d[2])}`);
      return;
    }
    if (e.target === e.target.getStage() || e.target.name() === "doc-bg") select(null);
  };
  // Double-click acts on the layer TYPE: text → inline editor (rewrite existing),
  // shape → native color picker (change fill). Other kinds just select.
  const onDbl = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const l = doc.layers.find((x) => x.id === e.target.name());
    if (!l || l.locked) return;
    if (l.kind === "text") {
      select(l.id);
      setEditId(l.id);
    } else if (l.kind === "shape") {
      select(l.id);
      colorTarget.current = l.id;
      const ci = colorInput.current;
      if (ci) {
        ci.value = (l.fillType === "gradient" && l.gradient ? l.gradient.from : l.fillColor) ?? "#3b82f6";
        ci.click();
      }
    }
  };
  const onPickColor = (v: string) => {
    const id = colorTarget.current;
    const l = id ? doc.layers.find((x) => x.id === id) : null;
    if (!id || !l) return;
    if (l.fillType === "gradient" && l.gradient) update(id, { gradient: { ...l.gradient, from: v } });
    else update(id, { fillColor: v });
  };
  const editing = editId ? doc.layers.find((l) => l.id === editId) ?? null : null;

  const registerNode = (id: string, n: Konva.Node | null) => {
    if (n) nodes.current.set(id, n);
    else nodes.current.delete(id);
  };

  return {
    selected, paintBox, editing, maskEditId,
    colorInput, boxRef, trRef,
    onBgDown, onDbl, onPickColor, registerNode,
    setEditId,
  };
}
