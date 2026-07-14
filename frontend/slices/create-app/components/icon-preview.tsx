"use client";

import { createElement } from "react";
import { glyphIcon } from "@/features/app-store";
import { cn } from "@/lib/utils";

// Live preview of the new app's icon. Shares AppIcon's --shell-icon-* tokens +
// .shell-icon-tile squircle, driven by the chosen CSS gradient + lucide glyph,
// so the preview matches how the tile will actually render in the current shell
// (flat on iOS, gently dimensional on macOS).
export function IconPreview({
  glyph,
  gradient,
  className,
}: {
  glyph: string;
  gradient: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "shell-icon-tile relative grid size-16 place-items-center overflow-hidden text-white",
        className,
      )}
      style={{ background: gradient, boxShadow: "var(--shell-icon-shadow)" }}
    >
      <span
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,var(--shell-icon-sheen)) 0%, rgba(255,255,255,0) 45%, rgba(0,0,0,var(--shell-icon-shade)) 100%)",
        }}
      />
      <span
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,var(--shell-icon-ring))" }}
      />
      {/* createElement: dynamic stateless lookup, not a render-created component */}
      {createElement(glyphIcon(glyph), { className: "relative z-[1] size-7" })}
    </span>
  );
}
