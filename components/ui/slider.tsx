"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Dependency-free range slider (os-rr KSlider style). Theme-token accent.
function Slider({
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <input
      type="range"
      className={cn(
        "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-[var(--accent)]",
        className,
      )}
      {...props}
    />
  );
}

export { Slider };
