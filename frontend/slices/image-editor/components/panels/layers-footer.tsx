"use client"

import { Brush, Copy, Crop, Plus, SlidersHorizontal, Square, SquareDashed, Trash2, Type } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { useEditor } from "../../lib/store"
import { createLayer } from "../../lib/model"

export function LayersFooter() {
  const { doc, selected, selectedId, addLayer, removeLayer, setTool, duplicateLayer, addMask, setMaskEdit, maskEditId, fg } =
    useEditor()

  const onMask = () => {
    if (!selected) return
    if (selected.mask) setMaskEdit(maskEditId === selected.id ? null : selected.id)
    else addMask(selected.id)
  }

  const newPaint = () =>
    addLayer(
      createLayer("paint", {
        t: {
          x: 0,
          y: 0,
          width: doc.width,
          height: doc.height,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        },
      }),
    )

  return (
    <div className="flex items-center gap-1 border-t border-border bg-card px-2 py-1.5">
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                aria-label="New layer"
              >
                <Plus className="size-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>New layer</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start">
          <DropdownMenuItem className="gap-2 text-xs" onSelect={newPaint}>
            <Brush className="size-4" />
            New Paint Layer
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 text-xs"
            onSelect={() => addLayer(createLayer("text", { fill: fg }))}
          >
            <Type className="size-4" />
            Text
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 text-xs"
            onSelect={() => addLayer(createLayer("shape", { fillColor: fg }))}
          >
            <Square className="size-4" />
            Shape
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 text-xs"
            onSelect={() => addLayer(createLayer("adjustment"))}
          >
            <SlidersHorizontal className="size-4" />
            Adjustment Layer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            aria-label="Duplicate"
            disabled={!selectedId}
            onClick={() => selectedId && duplicateLayer(selectedId)}
          >
            <Copy className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Duplicate</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            aria-label="Crop"
            onClick={() => setTool("crop")}
          >
            <Crop className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Crop</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className={cn("size-7", selected?.mask && maskEditId === selected.id && "bg-primary text-primary-foreground")}
            aria-label="Layer mask"
            disabled={!selected}
            onClick={onMask}
          >
            <SquareDashed className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{selected?.mask ? "Edit mask" : "Add mask"}</TooltipContent>
      </Tooltip>

      <div className="flex-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className={cn("size-7 text-destructive")}
            aria-label="Delete"
            disabled={!selectedId}
            onClick={() => selectedId && removeLayer(selectedId)}
          >
            <Trash2 className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Delete</TooltipContent>
      </Tooltip>
    </div>
  )
}
