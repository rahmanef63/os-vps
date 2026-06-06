"use client";

import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// A titled settings group: uppercase muted label row + content, divided by a rule.
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
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="[&_svg]:size-3.5">{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wide">{title}</span>
      </div>
      <Separator />
      <div className="space-y-3">{children}</div>
    </section>
  );
}
