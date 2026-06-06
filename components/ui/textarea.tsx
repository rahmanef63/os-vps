import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-16 w-full rounded-md border border-input bg-secondary px-2.5 py-1.5 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
