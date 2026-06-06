"use client";

import { useRef } from "react";
import { filterStr, type Adjustments } from "../lib/filters";
import { type Layer, type ToolId } from "../lib/model";
import type { SafePlatform } from "../lib/masks";
import { LayerView } from "./layer-view";
import { SafeArea } from "./safe-area";

const clampPct = (v: number) => Math.max(-60, Math.min(60, Math.round(v)));

// Center stage: checkerboard backdrop + an aspect-locked frame holding layers.
// Click with a shape/text/sticker tool places a layer; move tool drags layers.
export function CanvasStage({
  adjustments,
  layers,
  selected,
  tool,
  zoom,
  aspect,
  safe,
  platform,
  onSelect,
  onPlace,
  onMove,
  onDragStart,
}: {
  adjustments: Adjustments;
  layers: Layer[];
  selected: string | null;
  tool: ToolId;
  zoom: number;
  aspect: string;
  safe: boolean;
  platform: SafePlatform;
  onSelect: (id: string | null) => void;
  onPlace: (tool: ToolId, x: number, y: number) => void;
  onMove: (id: string, x: number, y: number) => void;
  onDragStart: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [aw, ah] = aspect.split("/").map((s) => parseFloat(s));
  const landscape = aw >= ah;

  const relativePct = (clientX: number, clientY: number) => {
    const r = ref.current!.getBoundingClientRect();
    return {
      x: ((clientX - (r.left + r.width / 2)) / r.width) * 100,
      y: ((clientY - (r.top + r.height / 2)) / r.height) * 100,
    };
  };

  const onCanvasClick = (e: React.MouseEvent) => {
    if (tool === "move") {
      if (e.target === e.currentTarget) onSelect(null);
      return;
    }
    const { x, y } = relativePct(e.clientX, e.clientY);
    onPlace(tool, clampPct(x), clampPct(y));
  };

  const onLayerPointerDown = (e: React.PointerEvent, layer: Layer) => {
    e.stopPropagation();
    onSelect(layer.id);
    if (tool !== "move" || e.button !== 0 || !ref.current) return;
    onDragStart();
    const rect = ref.current.getBoundingClientRect();
    const sx = e.clientX;
    const sy = e.clientY;
    const ox = layer.x;
    const oy = layer.y;
    const mv = (ev: PointerEvent) => {
      const dx = ((ev.clientX - sx) / rect.width) * 100;
      const dy = ((ev.clientY - sy) / rect.height) * 100;
      onMove(layer.id, clampPct(ox + dx), clampPct(oy + dy));
    };
    const up = () => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };

  return (
    <div
      className="flex flex-1 items-center justify-center overflow-hidden p-6"
      style={{
        backgroundImage:
          "repeating-conic-gradient(var(--muted) 0 25%, transparent 0 50%)",
        backgroundSize: "22px 22px",
      }}
    >
      <div
        ref={ref}
        onClick={onCanvasClick}
        className="relative overflow-hidden rounded-md shadow-2xl"
        style={{
          aspectRatio: aspect,
          width: landscape ? "min(100%,520px)" : "auto",
          height: landscape ? "auto" : "min(100%,380px)",
          transform: `scale(${zoom / 100})`,
          transition: "transform .2s",
          filter: filterStr(adjustments),
          background: "var(--card)",
          cursor: tool === "move" ? "default" : "crosshair",
        }}
      >
        {layers.map((l, i) =>
          l.visible ? (
            <LayerView
              key={l.id}
              layer={l}
              z={layers.length - i}
              selected={l.id === selected}
              interactive={tool === "move"}
              onPointerDown={onLayerPointerDown}
            />
          ) : null,
        )}
        {safe && <SafeArea platform={platform} />}
        {layers.length === 0 && (
          <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">
            Empty canvas — pick a tool
          </div>
        )}
      </div>
    </div>
  );
}
