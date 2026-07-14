"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// A padded block for freeform (non-Row) content inside a grouped settings card —
// hero headers, add-forms, save buttons — so they aren't flush to the card edge.
// Draws the same inset hairline as SettingsRow, dropped on the last child.
export function SettingsBlock({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative px-4 py-3",
        "after:absolute after:inset-x-0 after:bottom-0 after:left-4 after:h-px after:bg-border/60 last:after:hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
