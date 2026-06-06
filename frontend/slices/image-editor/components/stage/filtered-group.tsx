"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Group } from "react-konva";
import type Konva from "konva";
import type { Adjustments } from "../../lib/types";
import { buildFilters, hasFilters } from "../../lib/konva-helpers";

// An adjustment layer: a cached Konva group that applies `adj` (Konva.Filters)
// to ALL layers rendered below it — the editor-stage accumulator wraps the
// below-stack in this. Re-caches on `version` (history) so edits show live.
// v1: only active when at least one adjustment is non-neutral (else pass-through).
export function FilteredGroup({
  adj,
  width,
  height,
  version,
  children,
}: {
  adj: Adjustments;
  width: number;
  height: number;
  version: number;
  children: ReactNode;
}) {
  const ref = useRef<Konva.Group | null>(null);

  useEffect(() => {
    const g = ref.current;
    if (!g) return;
    const { filters, props } = buildFilters(adj);
    g.filters(filters);
    g.setAttrs({ brightness: 0, contrast: 0, hue: 0, saturation: 0, blurRadius: 0, ...props });
    if (hasFilters(adj)) g.cache({ x: 0, y: 0, width, height, pixelRatio: 1 });
    else g.clearCache();
    g.getLayer()?.batchDraw();
  }, [adj, width, height, version]);

  return <Group ref={ref}>{children}</Group>;
}
