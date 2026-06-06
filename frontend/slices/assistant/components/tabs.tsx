"use client";

// Slice-local ui primitive (minimal controlled tabs, os-rr style) — the
// shadcn/radix tabs have a different API (value/onValueChange context), so
// the slice ships the variant its workspace was built against.

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Tabs({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex flex-col", className)}>{children}</div>;
}

function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-lg bg-secondary p-0.5", className)}>
      {children}
    </div>
  );
}

function TabsTrigger({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        "h-auto rounded-md px-3 py-1 text-xs font-medium transition-colors",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {children}
    </Button>
  );
}

export { Tabs, TabsList, TabsTrigger };
