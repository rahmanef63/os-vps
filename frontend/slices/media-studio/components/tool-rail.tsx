"use client";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TOOLS, EMOJIS, type ToolId } from "../lib/model";

// Vertical icon tool rail. The Sticker tool toggles an emoji picker popover
// that drops a sticker layer onto the canvas. Each tool shows its shortcut.
export function ToolRail({
  active,
  emojiOpen,
  onSelect,
  onToggleEmoji,
  onPickEmoji,
}: {
  active: ToolId;
  emojiOpen: boolean;
  onSelect: (id: ToolId) => void;
  onToggleEmoji: () => void;
  onPickEmoji: (emoji: string) => void;
}) {
  return (
    <div className="relative flex w-12 shrink-0 flex-col items-center gap-1.5 border-r border-border bg-secondary/40 py-2.5">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const isActive =
          tool.id === "sticker" ? emojiOpen : active === tool.id;
        return (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`${tool.label} (${tool.key})`}
                aria-pressed={isActive}
                onClick={() =>
                  tool.id === "sticker" ? onToggleEmoji() : onSelect(tool.id)
                }
                className={cn(
                  "grid size-9 place-items-center rounded-lg transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {tool.label} · {tool.key}
            </TooltipContent>
          </Tooltip>
        );
      })}

      {emojiOpen && (
        <div
          className="absolute left-[52px] top-2 z-30 grid w-[180px] grid-cols-4 gap-1 rounded-xl border border-border bg-popover p-2 shadow-xl"
          onMouseLeave={onToggleEmoji}
        >
          {EMOJIS.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => onPickEmoji(em)}
              className="rounded-md p-1 text-xl leading-none transition-colors hover:bg-accent"
            >
              {em}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
