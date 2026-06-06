"use client";

import { createElement } from "react";
import { glyphIcon } from "@/features/app-store/lib/glyph";
import { cn } from "@/lib/utils";

// Live preview of the new app's glossy os-rr icon. Re-authors the AppIcon look
// (gradient base + top sheen) driven by the chosen CSS gradient + lucide glyph,
// so the user sees their app take shape before it exists in the dock.
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
        "relative grid size-16 place-items-center overflow-hidden rounded-[var(--radius-icon)] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),inset_0_-2px_5px_rgba(0,0,0,0.18),0_3px_8px_rgba(0,0,0,0.22)]",
        className,
      )}
      style={{ background: gradient }}
    >
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/45 to-transparent to-[48%]" />
      {/* createElement: dynamic stateless lookup, not a render-created component */}
      {createElement(glyphIcon(glyph), { className: "relative z-[1] size-7" })}
    </span>
  );
}
