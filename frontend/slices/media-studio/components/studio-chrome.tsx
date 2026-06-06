"use client";

import {
  Download,
  Undo2,
  Redo2,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ASPECTS } from "../lib/model";

// Top header: tool badge, undo/redo, panel toggle, export trigger.
export function StudioHeader({
  tool,
  canUndo,
  canRedo,
  panelOpen,
  onUndo,
  onRedo,
  onTogglePanel,
  onExport,
}: {
  tool: string;
  canUndo: boolean;
  canRedo: boolean;
  panelOpen: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onTogglePanel: () => void;
  onExport: () => void;
}) {
  return (
    <header className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">Image Editor</span>
        <Badge variant="secondary" className="font-mono text-[10px] capitalize">
          {tool}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Undo" disabled={!canUndo} onClick={onUndo}>
          <Undo2 className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Redo" disabled={!canRedo} onClick={onRedo}>
          <Redo2 className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={panelOpen ? "Hide panel" : "Show panel"}
          className="@md:hidden"
          onClick={onTogglePanel}
        >
          {panelOpen ? (
            <PanelRightClose className="size-4" />
          ) : (
            <PanelRightOpen className="size-4" />
          )}
        </Button>
        <Button size="sm" onClick={onExport}>
          <Download className="size-4" />
          Export
        </Button>
      </div>
    </header>
  );
}

// Bottom status bar: aspect + layer count, zoom slider.
export function StudioFooter({
  aspect,
  layerCount,
  zoom,
  onZoom,
}: {
  aspect: string;
  layerCount: number;
  zoom: number;
  onZoom: (z: number) => void;
}) {
  return (
    <footer className="flex h-9 shrink-0 items-center gap-3 border-t border-border bg-card px-3 text-[11px] text-muted-foreground">
      <span>
        {ASPECTS.find((a) => a.value === aspect)?.ratio ?? aspect} · {layerCount} layer
        {layerCount !== 1 ? "s" : ""}
      </span>
      <div className="ml-auto flex items-center gap-2">
        <span>Zoom</span>
        <Slider
          min={50}
          max={200}
          value={zoom}
          onChange={(e) => onZoom(Number(e.target.value))}
          className="w-20"
        />
        <span className="w-9 tabular-nums">{zoom}%</span>
      </div>
    </footer>
  );
}
