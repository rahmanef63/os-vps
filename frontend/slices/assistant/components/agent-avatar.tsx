import { createElement } from "react";
import { cn } from "@/lib/utils";
import { glyphIcon } from "./icon-map";

// Rounded glyph tile used everywhere an agent/skill/automation is shown. Color
// is a Tailwind palette class (theme token) stored on the item.
export function GlyphTile({
  glyph,
  color,
  size = 40,
  className,
}: {
  glyph: string;
  color: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid flex-none place-items-center rounded-xl text-white",
        color,
        className,
      )}
      style={{ width: size, height: size }}
    >
      {/* createElement: dynamic stateless lookup, not a render-created component */}
      {createElement(glyphIcon(glyph), {
        style: { width: size * 0.46, height: size * 0.46 },
      })}
    </span>
  );
}
