"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Layer } from "../../lib/model";
import { MASKS, PALETTE } from "../../lib/masks";
import { SectionLabel } from "./section";

// Quick fill/text palette: white/black/blue/pink/orange/green.
export function PaletteRow({
  value,
  onPick,
}: {
  value?: string;
  onPick: (c: string) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Color ${c}`}
          onClick={() => onPick(c)}
          className="size-5 rounded-full ring-1 ring-border"
          style={{
            background: c,
            outline: value === c ? "2px solid var(--primary)" : "none",
            outlineOffset: 2,
          }}
        />
      ))}
    </div>
  );
}

// Clip-path mask picker (None / circle / rounded / triangle / hexagon / star).
export function MaskRow({
  layer,
  onUpdate,
}: {
  layer: Layer;
  onUpdate: (patch: Partial<Layer>) => void;
}) {
  return (
    <div className="space-y-1.5">
      <SectionLabel>Mask / clip</SectionLabel>
      <div className="flex flex-wrap gap-1.5">
        {MASKS.map((m) => (
          <button
            key={m.id}
            type="button"
            title={m.label}
            onClick={() => onUpdate({ clip: m.value })}
            className={cn(
              "rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors",
              (layer.clip || "") === m.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-accent",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Kind-specific source editors: image URL, HTML/iframe markup.
export function SourceEditor({
  layer,
  onUpdate,
}: {
  layer: Layer;
  onUpdate: (patch: Partial<Layer>) => void;
}) {
  if (layer.kind === "image" && !layer.base) {
    return (
      <div className="space-y-1.5">
        <SectionLabel>Image URL</SectionLabel>
        <Input
          value={layer.src ?? ""}
          placeholder="https://…/photo.jpg"
          onChange={(e) => onUpdate({ src: e.target.value })}
          onKeyDown={(e) => e.stopPropagation()}
          className="h-7 text-xs"
        />
      </div>
    );
  }
  if (layer.kind === "html") {
    return (
      <div className="space-y-1.5">
        <SectionLabel>HTML / iframe</SectionLabel>
        <Textarea
          value={layer.html ?? ""}
          onChange={(e) => onUpdate({ html: e.target.value })}
          onKeyDown={(e) => e.stopPropagation()}
          className="h-20 resize-y font-mono text-[11px]"
        />
      </div>
    );
  }
  return null;
}

// Per-layer custom CSS injected onto the layer wrapper.
export function CssEditor({
  layer,
  onUpdate,
}: {
  layer: Layer;
  onUpdate: (patch: Partial<Layer>) => void;
}) {
  return (
    <div className="space-y-1.5">
      <SectionLabel>Custom CSS</SectionLabel>
      <Textarea
        value={layer.css ?? ""}
        placeholder="box-shadow: 0 8px 30px #000; border:2px solid #fff;"
        onChange={(e) => onUpdate({ css: e.target.value })}
        onKeyDown={(e) => e.stopPropagation()}
        className="h-16 resize-y font-mono text-[11px]"
      />
    </div>
  );
}
