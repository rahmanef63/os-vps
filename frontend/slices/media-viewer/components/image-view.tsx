"use client";

import type { Sample } from "../lib/samples";

// Zoomable image. The checkerboard transparency background lives on the parent
// stage; here we just render + scale the bitmap and surface its dimensions.
export function ImageView({ file, zoom }: { file: Sample; zoom: number }) {
  const dims = file.dims;
  return (
    <div className="flex flex-col items-center gap-3">
      {file.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={file.src}
          alt={file.name}
          className="max-h-full max-w-full rounded-lg shadow-2xl transition-transform duration-200"
          style={{ transform: `scale(${zoom})` }}
        />
      ) : (
        <div className="grid aspect-video w-[min(70vw,520px)] place-items-center rounded-lg border bg-card text-xs text-muted-foreground shadow-2xl">
          No preview
        </div>
      )}
      {dims && (
        <span className="font-mono text-[11px] text-muted-foreground">
          {dims.w} × {dims.h}
        </span>
      )}
    </div>
  );
}
