"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// One grouped-list row: label left, control right, with a hairline divider drawn
// on the row itself (inset 16px) so dividers land only between real rows — never
// around the custom blocks some sections drop into the card. Stacks the control
// under the label on narrow widths so segmented controls never overflow.
export function SettingsRow({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-[46px] flex-col gap-2 px-4 py-[11px] sm:flex-row sm:items-center sm:justify-between",
        "after:absolute after:inset-x-0 after:bottom-0 after:left-4 after:h-px after:bg-border/60 last:after:hidden",
        className,
      )}
    >
      <span className="text-sm text-foreground">{label}</span>
      <div className="min-w-0 w-full sm:w-auto sm:shrink-0">{children}</div>
    </div>
  );
}
