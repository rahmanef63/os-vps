"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// A titled settings group: an uppercase muted caption above a grouped card, so
// stacked sections read as the macOS/iOS System Settings list. Rows inside carry
// their own inset hairline dividers (see SettingsRow); custom blocks a section
// drops in sit flush in the same card.
export function SettingsSection({
  icon,
  title,
  children,
  className,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 px-1 text-muted-foreground">
        <span className="[&_svg]:size-3.5">{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wide">{title}</span>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">{children}</div>
    </section>
  );
}
