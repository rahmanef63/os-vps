"use client";

import { useCallback } from "react";
import type {
  Adjustments,
  DropShadow,
  Layer,
  LayerStyle,
  OuterGlow,
  Stroke,
} from "./types";

type MapLayer = (id: string, fn: (l: Layer) => Layer, track?: boolean) => void;

// The per-layer field/style/adjustment mutators, factored out of the store so
// store.tsx stays under the slice's 200-LOC cap. All route through `mapLayer`
// (which handles immutability + undo history).
export function useLayerMutators(mapLayer: MapLayer) {
  const update = useCallback((id: string, patch: Partial<Layer>) => mapLayer(id, (l) => ({ ...l, ...patch })), [mapLayer]);
  const patchStyle = useCallback((id: string, p: Partial<LayerStyle>) => mapLayer(id, (l) => ({ ...l, style: { ...l.style, ...p } })), [mapLayer]);
  const patchShadow = useCallback((id: string, p: Partial<DropShadow>) => mapLayer(id, (l) => ({ ...l, style: { ...l.style, shadow: { ...l.style.shadow, ...p } } })), [mapLayer]);
  const patchGlow = useCallback((id: string, p: Partial<OuterGlow>) => mapLayer(id, (l) => ({ ...l, style: { ...l.style, glow: { ...l.style.glow, ...p } } })), [mapLayer]);
  const patchStroke = useCallback((id: string, p: Partial<Stroke>) => mapLayer(id, (l) => ({ ...l, style: { ...l.style, stroke: { ...l.style.stroke, ...p } } })), [mapLayer]);
  const patchAdj = useCallback((id: string, p: Partial<Adjustments>) => mapLayer(id, (l) => ({ ...l, adj: { ...l.adj, ...p } })), [mapLayer]);
  return { update, patchStyle, patchShadow, patchGlow, patchStroke, patchAdj };
}
