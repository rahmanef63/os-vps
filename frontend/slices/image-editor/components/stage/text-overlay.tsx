"use client";

import { useEffect, useRef } from "react";
import type { Layer, Pan } from "../../lib/types";

// A DOM <textarea> floated over a text layer for direct on-canvas editing
// (double-click a text layer). Positioned in the canvas wrapper using the same
// pan+zoom transform as the Konva node so it sits exactly on top. Edits stream
// to the layer live; blur / Escape / Enter (without Shift) commits.
export function TextOverlay({
  layer,
  zoom,
  pan,
  onChange,
  onDone,
}: {
  layer: Layer;
  zoom: number;
  pan: Pan;
  onChange: (text: string) => void;
  onDone: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  const left = pan.x + layer.t.x * zoom;
  const top = pan.y + layer.t.y * zoom;
  const fontPx = (layer.fontSize ?? 64) * zoom * (layer.t.scaleX || 1);

  return (
    <textarea
      ref={ref}
      defaultValue={layer.text ?? ""}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onDone}
      onKeyDown={(e) => {
        if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) {
          e.preventDefault();
          onDone();
        }
        e.stopPropagation();
      }}
      spellCheck={false}
      className="absolute z-20 resize-none overflow-hidden border border-primary bg-transparent p-0 leading-tight outline-none"
      style={{
        left,
        top,
        minWidth: 40,
        transform: `rotate(${layer.t.rotation}deg)`,
        transformOrigin: "top left",
        fontSize: `${fontPx}px`,
        fontFamily: layer.fontFamily ?? "Inter, sans-serif",
        fontWeight: (layer.fontStyle ?? "").includes("bold") ? 700 : 400,
        fontStyle: (layer.fontStyle ?? "").includes("italic") ? "italic" : "normal",
        color: layer.fill ?? "#ffffff",
        textShadow: "0 0 2px rgba(0,0,0,.4)",
      }}
    />
  );
}
