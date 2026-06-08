"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Accent swatches. The color values ARE the data, so they render as inline
// background colors rather than theme tokens. Options injected by the consumer.
export function AccentSwatches({
  value,
  options,
  onSelect,
}: {
  value: string;
  options: string[];
  onSelect: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {options.map((color) => {
        const active = value === color;
        return (
          <Button
            key={color}
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Accent ${color}`}
            aria-pressed={active}
            onClick={() => onSelect(color)}
            style={{ background: color }}
            className={cn(
              "flex size-8 items-center justify-center rounded-full p-0 transition-transform hover:scale-110 sm:size-7",
              active && "ring-2 ring-ring ring-offset-2 ring-offset-background",
            )}
          >
            {active ? <Check className="size-3.5 text-white drop-shadow" /> : null}
          </Button>
        );
      })}
    </div>
  );
}
