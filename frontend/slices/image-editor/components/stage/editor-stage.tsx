"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer as KLayer, Rect, Transformer } from "react-konva";
import type Konva from "konva";
import { useEditor } from "../../lib/store";
import { useStageView } from "../../hooks/use-stage-view";
import { useStageInteractions } from "../../hooks/use-stage-interactions";
import { LayerNode } from "./layer-node";
import { MaskSurface } from "./mask-surface";
import { FilteredGroup } from "./filtered-group";
import { StageOverlays } from "./stage-overlays";

// The canvas surface: a measured Stage with the document positioned by `pan` and
// scaled by `zoom`. Wheel/pinch zoom, hand/space drag-pan, fit-to-screen (HUD).
// A Transformer attaches to the selection when the Move tool is active.
export function EditorStage() {
  const { doc, zoom, pan, tool, selectedId, setPan, update, version, stageRef, canUndo } = useEditor();
  // Pristine doc = untouched starter (no edits → a single empty Pixel layer).
  const pristine = !canUndo && doc.layers.length <= 1 && doc.layers[0]?.kind === "paint";
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const docLayerRef = useRef<Konva.Layer | null>(null);
  const { panMode, fit, center100, clampPan, onWheel, onTouchMove, onTouchEnd, zoomTo } = useStageView(size);
  const {
    selected, paintBox, editing, maskEditId,
    colorInput, boxRef, trRef,
    onBgDown, onDbl, onPickColor, registerNode, setEditId,
  } = useStageInteractions(panMode);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    // Round + bail-if-unchanged: sub-pixel contentRect jitter inside a flex/window
    // container would otherwise feed back (setSize → re-render → layout → observe →
    // setSize …) and trip React's "Maximum update depth" guard. Same object ref on
    // no-op so React skips the render entirely.
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width);
      const h = Math.round(e.contentRect.height);
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const zoomStep = (d: number) => zoomTo(zoom * (d > 0 ? 1.2 : 0.83), size.w / 2, size.h / 2);

  // Transparency checker pattern, painted only INSIDE the document (the
  // surrounding area is a flat gray pasteboard, Photoshop-style).
  const checker = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 16;
    const x = c.getContext("2d");
    if (x) {
      x.fillStyle = "#ffffff";
      x.fillRect(0, 0, 16, 16);
      x.fillStyle = "#cbd1d9";
      x.fillRect(0, 0, 8, 8);
      x.fillRect(8, 8, 8, 8);
    }
    return c;
  }, []);

  // Render loop (accumulator): an adjustment layer wraps everything below it in
  // a filtered cached group; other layers stack on top. See ARCHITECTURE.md.
  let acc: React.ReactNode[] = [];
  for (const l of doc.layers) {
    if (l.kind === "adjustment") {
      if (!l.visible) continue; // hidden adjustment = pass-through
      const below = acc;
      acc = [
        <FilteredGroup key={`adj-${l.id}`} adj={l.adj} width={doc.width} height={doc.height} version={version}>
          {below}
        </FilteredGroup>,
      ];
    } else {
      acc.push(<LayerNode key={l.id} layer={l} isSelected={l.id === selectedId} registerNode={registerNode} />);
    }
  }

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full overflow-hidden bg-neutral-200 dark:bg-neutral-800"
      style={{ cursor: panMode ? "grab" : "default" }}
    >
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        onMouseDown={onBgDown}
        onTouchStart={onBgDown}
        onWheel={onWheel}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onDblClick={onDbl}
        onDblTap={onDbl}
      >
        <KLayer
          ref={docLayerRef}
          x={pan.x}
          y={pan.y}
          scaleX={zoom}
          scaleY={zoom}
          draggable={panMode}
          // Konva drag events BUBBLE: dragging a child layer fires this too, with
          // e.target = the child. Only commit a pan when the doc layer ITSELF was
          // dragged (pan mode) — otherwise moving a layer would yank the canvas.
          onDragEnd={(e) => {
            const layer = docLayerRef.current;
            if (!layer || (e.target as unknown) !== (layer as unknown)) return;
            setPan(clampPan({ x: layer.x(), y: layer.y() }, zoom));
          }}
        >
          <Rect
            name="doc-bg"
            x={0}
            y={0}
            width={doc.width}
            height={doc.height}
            {...(doc.bg === "transparent"
              ? { fillPatternImage: checker as unknown as HTMLImageElement, fillPatternRepeat: "repeat" }
              : { fill: doc.bg })}
            shadowColor="#000000"
            shadowOpacity={0.4}
            shadowBlur={24}
            shadowOffsetY={6}
          />
          {acc}
          {/* Move handle for a paint layer: a near-invisible rect fitted to the
              painted pixels. Dragging it shifts the whole layer (the transformer
              draws the visible box around it). Empty layer → not rendered. */}
          {tool === "move" && selected?.kind === "paint" && !selected.locked && paintBox && (
            <Rect
              ref={boxRef}
              x={selected.t.x + paintBox.x}
              y={selected.t.y + paintBox.y}
              width={paintBox.w}
              height={paintBox.h}
              fill="#000"
              opacity={0.001}
              draggable
              onDragEnd={(e) => update(selected.id, { t: { ...selected.t, x: e.target.x() - paintBox.x, y: e.target.y() - paintBox.y } })}
            />
          )}
          {maskEditId && <MaskSurface layerId={maskEditId} />}
        </KLayer>
        <KLayer>
          <Transformer
            ref={trRef}
            rotateEnabled
            keepRatio={false}
            anchorSize={9}
            borderStroke="#3b82f6"
            anchorStroke="#3b82f6"
            anchorCornerRadius={2}
            boundBoxFunc={(o, n) => (n.width < 8 || n.height < 8 ? o : n)}
          />
        </KLayer>
      </Stage>

      <StageOverlays
        doc={doc}
        zoom={zoom}
        pan={pan}
        pristine={pristine}
        maskEditId={maskEditId}
        editing={editing}
        colorInput={colorInput}
        onPickColor={onPickColor}
        onZoomStep={zoomStep}
        onFit={fit}
        onReset={center100}
        onEditDone={() => setEditId(null)}
      />
    </div>
  );
}
