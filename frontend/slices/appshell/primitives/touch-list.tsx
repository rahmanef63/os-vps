"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useResponsive } from "../responsive/use-responsive";

// A list whose rows grow to ≥44px hit targets on coarse pointers (touch), and
// stay compact with a fine pointer (mouse). Wrap rows in <TouchRow> or pass
// plain children — the min-height is enforced via a child selector so existing
// row markup doesn't need to change.
export function TouchList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { pointer } = useResponsive();
  return (
    <div
      role="list"
      className={cn(
        "flex flex-col",
        pointer === "coarse" && "[&>*]:min-h-11",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TouchRow({
  children,
  onClick,
  selected,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}) {
  return (
    <div
      role="listitem"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
        onClick && "cursor-pointer hover:bg-accent",
        selected && "bg-accent",
        className,
      )}
    >
      {children}
    </div>
  );
}
