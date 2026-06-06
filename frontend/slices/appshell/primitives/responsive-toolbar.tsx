"use client";

import type { ComponentType } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useResponsive } from "../responsive/use-responsive";

export type ToolbarItem = {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  onClick: () => void;
  /** Stays inline even when compact (overflow-collapses the rest). */
  primary?: boolean;
  disabled?: boolean;
};

// Declare actions as DATA; the toolbar decides inline vs overflow. On compact
// form factors, non-primary actions collapse into a "⋯" menu so a wide desktop
// toolbar and a phone toolbar share one source. No per-app breakpoints.
export function ResponsiveToolbar({
  items,
  className,
}: {
  items: ToolbarItem[];
  className?: string;
}) {
  const { isMobile } = useResponsive();
  const inline = isMobile ? items.filter((i) => i.primary) : items;
  const overflow = isMobile ? items.filter((i) => !i.primary) : [];

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {inline.map((i) => (
        <Button
          key={i.id}
          size="sm"
          variant="ghost"
          onClick={i.onClick}
          disabled={i.disabled}
          className="gap-1.5"
        >
          {i.icon && <i.icon className="size-4" />}
          <span className={cn(isMobile && "sr-only @sm:not-sr-only")}>{i.label}</span>
        </Button>
      ))}
      {overflow.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" aria-label="More actions">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {overflow.map((i) => (
              <DropdownMenuItem key={i.id} onClick={i.onClick} disabled={i.disabled}>
                {i.icon && <i.icon className="mr-2 size-4" />}
                {i.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
