"use client";

import {
  MousePointer2,
  BoxSelect,
  Brush,
  Eraser,
  Pipette,
  Hand,
  Type,
  Square,
  Circle,
  type LucideIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEditor } from "../lib/store";
import { createLayer } from "../lib/model";
import type { Tool } from "../lib/types";
import { ColorSwatches } from "./panels/color-swatches";

// Vertical tool rail. Top group = persistent tool MODES (move/brush/eraser/
// hand). Bottom group = quick "add layer" actions (text / rect / ellipse) that
// drop a new layer centered on the canvas and switch to Move to position it.
export function ToolRail({ orientation = "vertical" }: { orientation?: "vertical" | "horizontal" }) {
  const { tool, setTool, doc, addLayer, fg } = useEditor();
  const horizontal = orientation === "horizontal";
  const tipSide = horizontal ? "top" : "right";

  const modes: { id: Tool; icon: LucideIcon; key: string; label: string }[] = [
    { id: "move", icon: MousePointer2, key: "V", label: "Move" },
    { id: "select", icon: BoxSelect, key: "M", label: "Select" },
    { id: "brush", icon: Brush, key: "B", label: "Brush" },
    { id: "eraser", icon: Eraser, key: "E", label: "Eraser" },
    { id: "eyedropper", icon: Pipette, key: "I", label: "Eyedropper" },
    { id: "hand", icon: Hand, key: "H", label: "Pan" },
  ];

  const center = (w: number, h: number) => ({
    x: Math.round((doc.width - w) / 2),
    y: Math.round((doc.height - h) / 2),
    width: w,
    height: h,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
  });

  const adds: { icon: LucideIcon; key: string; label: string; run: () => void }[] = [
    { icon: Type, key: "T", label: "Add text", run: () => { addLayer(createLayer("text", { fill: fg, t: center(400, 80) })); setTool("move"); } },
    { icon: Square, key: "R", label: "Add rectangle", run: () => { addLayer(createLayer("shape", { shape: "rect", fillColor: fg, t: center(320, 220) })); setTool("move"); } },
    { icon: Circle, key: "O", label: "Add ellipse", run: () => { addLayer(createLayer("shape", { shape: "ellipse", fillColor: fg, t: center(260, 260) })); setTool("move"); } },
  ];

  const Btn = ({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active?: boolean; onClick: () => void }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          aria-label={label}
          aria-pressed={active}
          onClick={onClick}
          className={cn(
            "grid size-9 place-items-center rounded-lg p-0 font-normal transition-colors hover:bg-transparent",
            active ? "bg-primary/20 text-primary" : "text-foreground/70 hover:bg-accent hover:text-foreground",
          )}
        >
          <Icon className="size-[18px]" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side={tipSide}>{label}</TooltipContent>
    </Tooltip>
  );

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-1.5 border-border bg-card",
        horizontal
          ? "h-12 w-full flex-row overflow-x-auto border-t px-2"
          : "w-12 flex-col border-r py-2.5",
      )}
    >
      {modes.map((m) => (
        <Btn key={m.id} icon={m.icon} label={`${m.label} (${m.key})`} active={tool === m.id} onClick={() => setTool(m.id)} />
      ))}
      <div className={cn("bg-border", horizontal ? "mx-1 h-6 w-px" : "my-1 h-px w-6")} />
      {adds.map((a) => (
        <Btn key={a.label} icon={a.icon} label={`${a.label} (${a.key})`} onClick={a.run} />
      ))}
      <div className={cn(horizontal ? "ml-auto" : "mt-auto")}>
        <ColorSwatches />
      </div>
    </div>
  );
}
