"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Minimal controlled tabs (no extra radix dep). Compose: <Tabs value onValueChange>
// <TabsList><TabsTrigger value/></TabsList> + render your own panels by value.
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
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1 text-xs font-medium transition-colors",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

export { Tabs, TabsList, TabsTrigger };
