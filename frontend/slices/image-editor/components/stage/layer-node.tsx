"use client";

import { useEffect, useRef } from "react";
import { Image as KonvaImage, Text, Rect, Ellipse } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEditor } from "../../lib/store";
import type { Layer } from "../../lib/types";
import { useKonvaImage } from "../../hooks/use-konva-image";
import {
  blendToGCO,
  buildFilters,
  fillProps,
  glowProps,
  hasFilters,
  shadowProps,
  strokeProps,
} from "../../lib/konva-helpers";
import { PaintLayer } from "./paint-layer";
import { MaskedGroup } from "./masked-group";
import { maskKey } from "../../lib/mask";

type NodeRef = Konva.Image | Konva.Text | Konva.Rect | Konva.Ellipse | null;

export function LayerNode({
  layer,
  isSelected,
  registerNode,
}: {
  layer: Layer;
  isSelected: boolean;
  registerNode: (id: string, node: NodeRef) => void;
}) {
  const { tool, update, select, version, canvasFor, doc } = useEditor();
  const ref = useRef<NodeRef>(null);
  const img = useKonvaImage(layer.kind === "image" ? layer.src : undefined);
  const set = (n: NodeRef) => {
    ref.current = n;
    registerNode(layer.id, n);
  };

  // Apply filters imperatively (avoids typing the many filter props on every
  // react-konva node) + (re)cache so Konva.Filters take effect. Reset the filter
  // attrs first so removing an adjustment restores the neutral value.
  useEffect(() => {
    const n: Konva.Node | null = ref.current;
    if (!n) return;
    const { filters, props } = buildFilters(layer.adj);
    n.filters(filters);
    n.setAttrs({ brightness: 0, contrast: 0, hue: 0, saturation: 0, blurRadius: 0, ...props });
    if (hasFilters(layer.adj)) n.cache();
    else n.clearCache();
    n.getLayer()?.batchDraw();
  }, [layer.adj, img, layer.t.width, layer.t.height, layer.text, layer.fontSize, layer.fillColor, layer.shape]);

  // Wrap the rendered content through a layer mask when present (cached group +
  // destination-in). Computed below as `content`, wrapped at the end.
  const wrap = (content: React.ReactNode) =>
    layer.mask ? (
      <MaskedGroup maskCanvas={canvasFor(maskKey(layer.id), doc.width, doc.height)} width={doc.width} height={doc.height} version={version}>
        {content}
      </MaskedGroup>
    ) : (
      <>{content}</>
    );

  if (layer.kind === "paint") {
    return wrap(
      <PaintLayer
        layer={layer}
        isSelected={isSelected}
        nodeRef={(n) => set(n)}
        onSelect={() => select(layer.id)}
        onChange={(patch) => update(layer.id, patch)}
      />,
    );
  }

  const common = {
    name: layer.id,
    x: layer.t.x,
    y: layer.t.y,
    rotation: layer.t.rotation,
    scaleX: layer.t.scaleX,
    scaleY: layer.t.scaleY,
    opacity: layer.opacity,
    visible: layer.visible,
    draggable: tool === "move" && !layer.locked,
    globalCompositeOperation: (layer.style.clipBelow ? "source-atop" : blendToGCO(layer.style.blend)) as GlobalCompositeOperation,
    onClick: () => tool === "move" && select(layer.id),
    onTap: () => tool === "move" && select(layer.id),
    onDragEnd: (e: KonvaEventObject<DragEvent>) =>
      update(layer.id, { t: { ...layer.t, x: e.target.x(), y: e.target.y() } }),
    onTransformEnd: (e: KonvaEventObject<Event>) => {
      const n = e.target;
      update(layer.id, {
        t: { ...layer.t, x: n.x(), y: n.y(), rotation: n.rotation(), scaleX: n.scaleX(), scaleY: n.scaleY() },
      });
    },
  };

  if (layer.kind === "image") {
    if (!img) return null;
    const w = layer.t.width || img.width;
    const h = layer.t.height || img.height;
    return wrap(
      <>
        {layer.style.glow.enabled && (
          <KonvaImage image={img} x={layer.t.x} y={layer.t.y} width={w} height={h} rotation={layer.t.rotation} scaleX={layer.t.scaleX} scaleY={layer.t.scaleY} opacity={layer.opacity} visible={layer.visible} listening={false} {...glowProps(layer.style)} />
        )}
        <KonvaImage ref={set} image={img} width={w} height={h} {...common} {...shadowProps(layer.style)} />
      </>,
    );
  }

  if (layer.kind === "text") {
    const textProps = {
      text: layer.text ?? "",
      fontSize: layer.fontSize ?? 64,
      fontFamily: layer.fontFamily ?? "Inter, sans-serif",
      fontStyle: layer.fontStyle ?? "normal",
      align: layer.align ?? "left",
      fill: layer.fill ?? "#ffffff",
    };
    return wrap(
      <>
        {layer.style.glow.enabled && <Text {...textProps} x={layer.t.x} y={layer.t.y} rotation={layer.t.rotation} scaleX={layer.t.scaleX} scaleY={layer.t.scaleY} opacity={layer.opacity} visible={layer.visible} listening={false} {...glowProps(layer.style)} />}
        <Text ref={set as (n: Konva.Text | null) => void} {...textProps} {...common} {...shadowProps(layer.style)} {...strokeProps(layer.style)} />
      </>,
    );
  }

  // shape
  const w = layer.t.width || 240;
  const h = layer.t.height || 160;
  const fill = fillProps(layer, w, h);
  if (layer.shape === "ellipse") {
    return wrap(
      <Ellipse ref={set as (n: Konva.Ellipse | null) => void} radiusX={w / 2} radiusY={h / 2} {...fill} {...common} {...shadowProps(layer.style)} {...strokeProps(layer.style)} />,
    );
  }
  return wrap(
    <Rect ref={set as (n: Konva.Rect | null) => void} width={w} height={h} {...fill} cornerRadius={8} {...common} {...shadowProps(layer.style)} {...strokeProps(layer.style)} />,
  );
}
