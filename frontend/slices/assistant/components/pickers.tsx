"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { glyphIcon } from "./icon-map";

// Icon (glyph) and color swatch pickers shared by the editors. Colors are
// Tailwind palette utility classes so no raw hex leaks into the slice.
export function GlyphPick({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (g: string) => void;
  options: readonly string[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((g) => {
        const Icon = glyphIcon(g);
        return (
          <Button
            key={g}
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(g)}
            className={cn(
              "grid size-9 place-items-center rounded-lg border bg-muted p-0 text-muted-foreground",
              value === g ? "border-2 border-primary text-foreground" : "border-border",
            )}
          >
            <Icon className="size-4" />
          </Button>
        );
      })}
    </div>
  );
}

export function ColorPick({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (c: string) => void;
  options: readonly string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((c) => (
        <Button
          key={c}
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Color ${c}`}
          onClick={() => onChange(c)}
          className={cn(
            "size-7 rounded-lg p-0",
            c,
            value === c && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          )}
        />
      ))}
    </div>
  );
}
