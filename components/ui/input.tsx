import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-8 w-full rounded-md border border-input bg-secondary px-2.5 py-1 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
