"use client";

import { ChevronUp, ChevronDown, Trash2, Type, Square, Image, Code } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import type { Layer, LayerKind } from "../../lib/model";
import { SectionLabel } from "./section";

const ADD_KINDS: { kind: LayerKind; label: string; icon: typeof Type }[] = [
  { kind: "text", label: "Text", icon: Type },
  { kind: "shape", label: "Shape", icon: Square },
  { kind: "image", label: "Image", icon: Image },
  { kind: "html", label: "Embed", icon: Code },
];

// Layers list (front-to-back). Per row: visibility, opacity, reorder, delete,
// inline rename. Selecting a row drives the transform panel.
export function LayersPanel({
  layers,
  selected,
  onSelect,
  onToggle,
  onOpacity,
  onMove,
  onDelete,
  onRename,
  onAdd,
}: {
  layers: Layer[];
  selected: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onOpacity: (id: string, v: number) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onAdd: (kind: LayerKind) => void;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <SectionLabel>Layers</SectionLabel>
        <div className="flex gap-1">
          {ADD_KINDS.map(({ kind, label, icon: Icon }) => (
            <button
              key={kind}
              type="button"
              aria-label={`Add ${label}`}
              title={`Add ${label}`}
              onClick={() => onAdd(kind)}
              className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Icon className="size-3.5" />
            </button>
          ))}
        </div>
      </div>
      {layers.map((layer, i) => (
        <div
          key={layer.id}
          onClick={() => onSelect(layer.id)}
          className={cn(
            "rounded-lg border p-2.5 transition-colors",
            selected === layer.id
              ? "border-primary bg-accent"
              : "border-border hover:bg-accent/50",
          )}
        >
          <div className="flex items-center gap-2">
            <Input
              value={layer.name}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onRename(layer.id, e.target.value)}
              className="h-6 flex-1 px-1.5 text-xs"
            />
            <span
              role="presentation"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(layer.id);
              }}
            >
              <Switch
                checked={layer.visible}
                onCheckedChange={() => onToggle(layer.id)}
              />
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="w-10 text-[10px] uppercase tracking-wide text-muted-foreground">
              Opacity
            </span>
            <Slider
              min={0}
              max={100}
              value={layer.opacity}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onOpacity(layer.id, Number(e.target.value))}
            />
            <span className="w-8 text-right text-[10px] tabular-nums text-muted-foreground">
              {layer.opacity}%
            </span>
          </div>
          <div className="mt-2 flex items-center justify-end gap-1">
            <RowBtn
              label="Move up"
              disabled={i === 0}
              onClick={() => onMove(layer.id, -1)}
            >
              <ChevronUp className="size-3.5" />
            </RowBtn>
            <RowBtn
              label="Move down"
              disabled={i === layers.length - 1}
              onClick={() => onMove(layer.id, 1)}
            >
              <ChevronDown className="size-3.5" />
            </RowBtn>
            <RowBtn label="Delete" onClick={() => onDelete(layer.id)}>
              <Trash2 className="size-3.5" />
            </RowBtn>
          </div>
        </div>
      ))}
    </section>
  );
}

function RowBtn({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
    >
      {children}
    </button>
  );
}
