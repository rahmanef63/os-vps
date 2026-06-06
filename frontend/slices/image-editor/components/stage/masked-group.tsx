"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Group, Image as KonvaImage } from "react-konva";
import type Konva from "konva";

// Renders a layer THROUGH its mask: the layer content + a doc-aligned mask image
// composited with `destination-in` (keeps the layer only where the mask is
// opaque), inside a CACHED group so the composite is baked. Re-caches on every
// `version` bump (mask strokes, transforms, undo) so edits show immediately.
// v1 note: a masked layer blends as "normal" (the group composites source-over).
export function MaskedGroup({
  maskCanvas,
  width,
  height,
  version,
  children,
}: {
  maskCanvas: HTMLCanvasElement;
  width: number;
  height: number;
  version: number;
  children: ReactNode;
}) {
  const ref = useRef<Konva.Group | null>(null);
  useEffect(() => {
    const g = ref.current;
    if (!g) return;
    g.cache({ x: 0, y: 0, width, height, pixelRatio: 1 });
    g.getLayer()?.batchDraw();
  }, [version, width, height]);

  return (
    <Group ref={ref}>
      {children}
      <KonvaImage image={maskCanvas} x={0} y={0} width={width} height={height} globalCompositeOperation="destination-in" listening={false} />
    </Group>
  );
}
