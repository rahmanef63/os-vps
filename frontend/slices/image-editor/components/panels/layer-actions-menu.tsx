"use client"

import {
  ChevronDown,
  ChevronUp,
  Copy,
  Lock,
  MoreVertical,
  Pencil,
  SquareDashed,
  Trash2,
  Unlock,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { useEditor } from "../../lib/store"
import type { Layer } from "../../lib/types"

export function LayerActionsMenu({
  layer,
  onRename,
  open,
  onOpenChange,
}: {
  layer: Layer
  onRename: () => void
  // Optional controlled open — lets the layer row open this same menu on right-click.
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const { duplicateLayer, removeLayer, raise, lower, update, addMask, removeMask, setMaskEdit, maskEditId } = useEditor()

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          aria-label="Layer actions"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="gap-2 text-xs" onSelect={() => onRename()}>
          <Pencil className="size-4" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 text-xs"
          onSelect={() => duplicateLayer(layer.id)}
        >
          <Copy className="size-4" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 text-xs"
          onSelect={() => raise(layer.id)}
        >
          <ChevronUp className="size-4" />
          Bring Forward
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 text-xs"
          onSelect={() => lower(layer.id)}
        >
          <ChevronDown className="size-4" />
          Send Backward
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 text-xs"
          onSelect={() => update(layer.id, { locked: !layer.locked })}
        >
          {layer.locked ? (
            <Unlock className="size-4" />
          ) : (
            <Lock className="size-4" />
          )}
          {layer.locked ? "Unlock" : "Lock"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {layer.mask ? (
          <>
            <DropdownMenuItem className="gap-2 text-xs" onSelect={() => setMaskEdit(maskEditId === layer.id ? null : layer.id)}>
              <SquareDashed className="size-4" />
              {maskEditId === layer.id ? "Stop editing mask" : "Edit mask"}
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-xs" onSelect={() => removeMask(layer.id)}>
              <SquareDashed className="size-4" />
              Delete mask
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem className="gap-2 text-xs" onSelect={() => addMask(layer.id)}>
            <SquareDashed className="size-4" />
            Add mask
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={cn("gap-2 text-xs text-destructive")}
          onSelect={() => removeLayer(layer.id)}
        >
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
