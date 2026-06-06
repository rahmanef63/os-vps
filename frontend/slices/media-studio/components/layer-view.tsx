"use client";

import type { Layer } from "../lib/model";
import { parseCss } from "../lib/masks";

// Renders one layer absolutely inside the canvas, transformed in % space.
// In move mode the layer is grabbable (pointer-down starts a drag in CanvasStage).
export function LayerView({
  layer,
  z,
  selected,
  interactive,
  onPointerDown,
}: {
  layer: Layer;
  z: number;
  selected: boolean;
  interactive: boolean;
  onPointerDown: (e: React.PointerEvent, layer: Layer) => void;
}) {
  const wrap: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    zIndex: z,
    opacity: layer.opacity / 100,
    transform: `translate(${layer.x}%,${layer.y}%) scale(${layer.scale / 100}) rotate(${layer.rotate}deg)`,
    cursor: interactive ? "grab" : "crosshair",
    pointerEvents: interactive ? "auto" : "none",
    ...parseCss(layer.css),
  };

  const ring: React.CSSProperties = selected
    ? { outline: "2px dashed rgba(255,255,255,.9)", outlineOffset: -3 }
    : {};

  return (
    <div style={wrap} onPointerDown={(e) => onPointerDown(e, layer)}>
      <LayerBody layer={layer} ring={ring} />
    </div>
  );
}

function LayerBody({ layer, ring }: { layer: Layer; ring: React.CSSProperties }) {
  const clip = layer.clip || undefined;

  if (layer.kind === "text") {
    return (
      <span
        style={{
          ...ring,
          position: "relative",
          padding: "4px 10px",
          color: layer.color,
          fontWeight: 800,
          fontSize: 34,
          letterSpacing: "-.02em",
          textShadow: "0 2px 14px rgba(0,0,0,.35)",
          textAlign: "center",
          clipPath: clip,
        }}
      >
        {layer.text}
      </span>
    );
  }
  if (layer.kind === "sticker") {
    return (
      <span
        style={{
          ...ring,
          position: "relative",
          fontSize: 54,
          lineHeight: 1,
          filter: "drop-shadow(0 3px 8px rgba(0,0,0,.4))",
          clipPath: clip,
        }}
      >
        {layer.emoji}
      </span>
    );
  }
  if (layer.kind === "shape") {
    return (
      <div
        style={{
          ...ring,
          position: "relative",
          width: "46%",
          height: "46%",
          borderRadius: layer.shape === "ellipse" ? "50%" : 18,
          background: layer.color,
          clipPath: clip,
        }}
      />
    );
  }
  if (layer.kind === "html") {
    return (
      <div
        style={{
          ...ring,
          position: "relative",
          maxWidth: "90%",
          maxHeight: "90%",
          overflow: "auto",
          clipPath: clip,
        }}
      >
        <iframe
          title={layer.name}
          srcDoc={layer.html || ""}
          sandbox="allow-scripts"
          className="block border-0 bg-transparent"
          style={{ width: 320, height: 180, pointerEvents: "none" }}
        />
      </div>
    );
  }
  // image / base
  return (
    <div
      style={{
        ...ring,
        position: "relative",
        width: layer.base ? "100%" : "62%",
        height: layer.base ? "100%" : "62%",
        overflow: "hidden",
        borderRadius: layer.base ? 0 : 8,
        background: layer.tint,
        clipPath: clip,
      }}
    >
      {layer.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={layer.src}
          alt={layer.name}
          className="size-full object-cover"
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(45deg,rgba(255,255,255,.08) 0 12px,transparent 12px 24px)",
          }}
        />
      )}
    </div>
  );
}
