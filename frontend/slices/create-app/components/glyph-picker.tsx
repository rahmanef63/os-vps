"use client";

// TODO: refactor through barrel — app-store barrel doesn't re-export glyph helpers yet
// eslint-disable-next-line no-restricted-imports
import { GLYPH_KEYS, glyphIcon } from "@/features/app-store/lib/glyph";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Glyph picker — the 8 shared icon keys rendered as selectable lucide tiles.
export function GlyphPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {GLYPH_KEYS.map((key) => {
        const G = glyphIcon(key);
        return (
          <Button
            key={key}
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`glyph ${key}`}
            onClick={() => onChange(key)}
            className={cn(
              "grid size-9 place-items-center rounded-md p-0 ring-offset-2 ring-offset-background transition",
              value === key
                ? "bg-primary text-primary-foreground ring-2 ring-primary hover:bg-primary"
                : "bg-secondary text-muted-foreground ring-1 ring-border hover:text-foreground",
            )}
          >
            <G className="size-4" />
          </Button>
        );
      })}
    </div>
  );
}
