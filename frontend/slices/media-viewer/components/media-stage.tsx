"use client";

import { FileText, FileQuestion } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Sample } from "../lib/samples";
import { ImageView } from "./image-view";
import { VideoPlayer } from "./video-player";
import { AudioPlayer } from "./audio-player";

// Checkerboard so transparent/letterboxed media reads clearly offline.
const CHECKER =
  "bg-[repeating-conic-gradient(var(--muted)_0_25%,transparent_0_50%)] bg-[length:24px_24px]";

export function MediaStage({ file, zoom }: { file: Sample; zoom: number }) {
  // Image keeps the checkerboard; timed/dark media sits on a flat dark stage.
  const checker = file.kind === "image";
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 items-center justify-center overflow-auto p-3 @md:p-6",
        checker ? CHECKER : "bg-[#0c0d10]",
      )}
    >
      <Stage file={file} zoom={zoom} />
    </div>
  );
}

function Stage({ file, zoom }: { file: Sample; zoom: number }) {
  if (file.kind === "image") return <ImageView file={file} zoom={zoom} />;
  if (file.kind === "video") return <VideoPlayer file={file} />;
  if (file.kind === "audio") return <AudioPlayer file={file} />;
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-xl border bg-card p-8 text-center text-muted-foreground shadow-2xl">
      {file.kind === "pdf" ? (
        <FileText className="size-10" />
      ) : (
        <FileQuestion className="size-10" />
      )}
      <div className="text-sm font-semibold text-foreground">{file.name}</div>
      <div className="text-xs">
        {file.kind === "pdf"
          ? "PDF preview is not available in the mock filesystem."
          : "No preview available for this file type."}
        {file.meta ? ` · ${file.meta}` : ""}
      </div>
    </div>
  );
}
