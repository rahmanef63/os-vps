"use client";

import { Input } from "@/components/ui/input";
import type { Layer } from "../../lib/model";
import { SectionLabel, KSlider } from "./section";
import { PaletteRow, MaskRow, SourceEditor, CssEditor } from "./layer-extras";

// Per-layer editor: kind-specific source, color palette, transform sliders,
// clip mask, and custom CSS.
export function TransformPanel({
  layer,
  onUpdate,
}: {
  layer: Layer;
  onUpdate: (patch: Partial<Layer>) => void;
}) {
  return (
    <section className="space-y-2.5 border-t border-border pt-3">
      <SectionLabel>Edit · {layer.name}</SectionLabel>

      {layer.kind === "text" && (
        <Input
          value={layer.text ?? ""}
          onChange={(e) => onUpdate({ text: e.target.value })}
          onKeyDown={(e) => e.stopPropagation()}
          className="h-7 text-xs"
        />
      )}

      <SourceEditor layer={layer} onUpdate={onUpdate} />

      {(layer.kind === "text" || layer.kind === "shape") && (
        <PaletteRow value={layer.color} onPick={(c) => onUpdate({ color: c })} />
      )}

      <KSlider
        label="Scale"
        value={layer.scale}
        min={20}
        max={300}
        unit="%"
        onChange={(v) => onUpdate({ scale: v })}
      />
      <KSlider
        label="Position X"
        value={layer.x}
        min={-60}
        max={60}
        unit="%"
        onChange={(v) => onUpdate({ x: v })}
      />
      <KSlider
        label="Position Y"
        value={layer.y}
        min={-60}
        max={60}
        unit="%"
        onChange={(v) => onUpdate({ y: v })}
      />
      <KSlider
        label="Rotation"
        value={layer.rotate}
        min={-180}
        max={180}
        unit="°"
        onChange={(v) => onUpdate({ rotate: v })}
      />
      <KSlider
        label="Opacity"
        value={layer.opacity}
        min={0}
        max={100}
        unit="%"
        onChange={(v) => onUpdate({ opacity: v })}
      />

      <MaskRow layer={layer} onUpdate={onUpdate} />
      <CssEditor layer={layer} onUpdate={onUpdate} />
    </section>
  );
}
