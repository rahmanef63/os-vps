import Konva from "konva";
import type { Filter } from "konva/lib/Node";
import type { Adjustments, BlendMode, LayerStyle } from "./types";

// Konva node `globalCompositeOperation` IS the CSS/canvas blend value, except
// "normal" → "source-over".
export function blendToGCO(blend: BlendMode): GlobalCompositeOperation {
  return (blend === "normal" ? "source-over" : blend) as GlobalCompositeOperation;
}

// Drop-shadow: Photoshop angle+distance → x/y offset. angle 90° = straight down.
export function shadowProps(style: LayerStyle) {
  const s = style.shadow;
  if (!s.enabled) return { shadowEnabled: false };
  const rad = (s.angle * Math.PI) / 180;
  return {
    shadowEnabled: true,
    shadowColor: s.color,
    shadowBlur: s.size,
    shadowOpacity: s.opacity,
    shadowOffsetX: Math.cos(rad) * s.distance,
    shadowOffsetY: Math.sin(rad) * s.distance,
  };
}

// Outer glow = a centered shadow (offset 0). One Konva node carries ONE shadow,
// so the layer renders a SECOND clone behind it wearing only these props.
export function glowProps(style: LayerStyle) {
  const g = style.glow;
  return {
    shadowEnabled: true,
    shadowColor: g.color,
    shadowBlur: g.size,
    shadowOpacity: g.opacity,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  };
}

// Shape fill: a solid color, or a linear gradient across the w×h box at `angle`.
export function fillProps(layer: { fillColor?: string; fillType?: string; gradient?: { from: string; to: string; angle: number } }, w: number, h: number) {
  if (layer.fillType === "gradient" && layer.gradient) {
    const rad = (layer.gradient.angle * Math.PI) / 180;
    return {
      fillPriority: "linear-gradient" as const,
      fillLinearGradientStartPoint: { x: 0, y: 0 },
      fillLinearGradientEndPoint: { x: w * Math.cos(rad), y: h * Math.sin(rad) },
      fillLinearGradientColorStops: [0, layer.gradient.from, 1, layer.gradient.to],
    };
  }
  return { fill: layer.fillColor ?? "#3b82f6" };
}

export function strokeProps(style: LayerStyle) {
  const s = style.stroke;
  if (!s.enabled) return {};
  return { stroke: s.color, strokeWidth: s.width, strokeScaleEnabled: false };
}

// Build the Konva.Filters array + the per-filter prop bag for a node. The node
// must be cached (node.cache()) for filters to apply — the layer-node does that.
export function buildFilters(adj: Adjustments) {
  const filters: Filter[] = [];
  const props: Record<string, number> = {};
  if (adj.brightness !== 0) {
    filters.push(Konva.Filters.Brighten);
    props.brightness = adj.brightness;
  }
  if (adj.contrast !== 0) {
    filters.push(Konva.Filters.Contrast);
    props.contrast = adj.contrast;
  }
  if (adj.hue !== 0 || adj.saturation !== 0) {
    filters.push(Konva.Filters.HSL);
    props.hue = adj.hue;
    props.saturation = adj.saturation;
  }
  if (adj.blur > 0) {
    filters.push(Konva.Filters.Blur);
    props.blurRadius = adj.blur;
  }
  if (adj.grayscale) filters.push(Konva.Filters.Grayscale);
  if (adj.invert) filters.push(Konva.Filters.Invert);
  if (adj.sepia) filters.push(Konva.Filters.Sepia);
  return { filters, props };
}

// True if any non-destructive filter is active (→ the node needs caching).
export function hasFilters(adj: Adjustments): boolean {
  return (
    adj.brightness !== 0 ||
    adj.contrast !== 0 ||
    adj.hue !== 0 ||
    adj.saturation !== 0 ||
    adj.blur > 0 ||
    adj.grayscale ||
    adj.invert ||
    adj.sepia
  );
}

// Load an image URL → HTMLImageElement (crossOrigin set so toDataURL/export and
// filter caching don't taint the canvas).
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
