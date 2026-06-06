"use client";

import { Undo2, Redo2, PanelRight, Sparkles, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RATIOS } from "../lib/composition";
import { type Composition } from "../lib/mock-timeline";

export type PanelMode = "editor" | "ai";

// Action toolbar (row under the menu bar): aspect-ratio quick-switch on the
// left; undo/redo, panel toggle, and the Render button on the right.
export function Toolbar({
  comp,
  mode,
  canUndo,
  canRedo,
  onRatio,
  onUndo,
  onRedo,
  onTogglePanel,
  onRender,
}: {
  comp: Composition;
  mode: PanelMode;
  canUndo: boolean;
  canRedo: boolean;
  onRatio: (w: number, h: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onTogglePanel: () => void;
  onRender: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background/60 px-3 py-1.5">
      <div className="flex gap-1">
        {RATIOS.map((r) => {
          const on = comp.w === r.w && comp.h === r.h;
          return (
            <Button
              key={r.label}
              type="button"
              variant="ghost"
              title={r.dims}
              onClick={() => onRatio(r.w, r.h)}
              className={cn(
                "h-6 gap-0 rounded-md px-2 text-[11px] font-bold transition-colors hover:bg-secondary",
                on ? "bg-primary text-primary-foreground hover:bg-primary" : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {r.label}
            </Button>
          );
        })}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="icon" className="size-8" title="Undo (⌘Z)" aria-label="Undo" disabled={!canUndo} onClick={onUndo}>
          <Undo2 className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" className="size-8" title="Redo (⌘⇧Z)" aria-label="Redo" disabled={!canRedo} onClick={onRedo}>
          <Redo2 className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" className="size-8" title="Toggle panel" aria-label="Toggle panel" onClick={onTogglePanel}>
          {mode === "ai" ? <Sparkles className="size-4" /> : <PanelRight className="size-4" />}
        </Button>
        <Button size="sm" onClick={onRender}>
          <Play className="size-4" />
          Render
        </Button>
      </div>
    </div>
  );
}
