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
  const Icon = glyphIcon(glyph);
  return (
    <span
      className={cn(
        "grid flex-none place-items-center rounded-xl text-white",
        color,
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Icon style={{ width: size * 0.46, height: size * 0.46 }} />
    </span>
  );
}
