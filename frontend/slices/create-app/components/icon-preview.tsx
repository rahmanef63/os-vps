"use client";

import { createElement } from "react";
// TODO: refactor through barrel — app-store barrel doesn't re-export glyph helpers yet
// eslint-disable-next-line no-restricted-imports
import { glyphIcon } from "@/features/app-store/lib/glyph";
import { cn } from "@/lib/utils";

// Live preview of the new app's macOS-style icon. Re-authors the AppIcon look
// (gradient tile + soft top light + hairline ring) driven by the chosen CSS
// gradient + lucide glyph, so the user sees their app before it hits the dock.
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
        "relative grid size-16 place-items-center overflow-hidden rounded-[var(--radius-icon)] text-white",
        "shadow-[0_1px_2px_rgba(0,0,0,0.2),0_4px_10px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.12)]",
        className,
      )}
      style={{ background: gradient }}
    >
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.32),rgba(255,255,255,0.08)_42%,rgba(255,255,255,0)_60%,rgba(0,0,0,0.08))]" />
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/15" />
      {/* createElement: dynamic stateless lookup, not a render-created component */}
      {createElement(glyphIcon(glyph), { className: "relative z-[1] size-7" })}
    </span>
  );
}
