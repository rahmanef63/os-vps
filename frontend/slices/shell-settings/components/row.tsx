"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Label on the left, control on the right. Stacks the control under the label on
// narrow widths so segmented controls never overflow the window.
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
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", className)}>
      <span className="text-sm text-foreground">{label}</span>
      <div className="min-w-0 w-full sm:w-auto sm:shrink-0">{children}</div>
    </div>
  );
}
