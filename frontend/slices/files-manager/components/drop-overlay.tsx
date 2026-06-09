"use client";

import { Upload } from "lucide-react";

// Full-window highlight shown while an external file/folder drag hovers the app.
export function DropOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[60] m-2 grid place-items-center rounded-xl border-2 border-dashed border-primary bg-primary/10 backdrop-blur-[2px]">
      <div className="flex flex-col items-center gap-2 text-primary">
        <Upload className="size-7" />
        <span className="text-sm font-semibold">Drop files &amp; folders to upload</span>
      </div>
    </div>
  );
}
