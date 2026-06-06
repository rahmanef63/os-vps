"use client";

import { useEffect, useState } from "react";
import { ImageIcon, FileText, Film, Music, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { openWindow, usePublishInspector } from "@/features/os-shell";
import { rawUrl } from "@/lib/os-api";
import { cn } from "@/lib/utils";
import { editorFor } from "../lib/media";

export type MediaKind = "image" | "video" | "audio" | "pdf";
export type RemoteFile = { path: string; name: string; kind: MediaKind };

// Checkerboard stage so transparent/letterboxed media reads clearly.
const STAGE =
  "bg-[repeating-conic-gradient(var(--muted)_0_25%,transparent_0_50%)] bg-[length:24px_24px]";

// Renders a real host file by streaming its bytes from /api/v1/fs/raw (the
// session cookie authenticates the <img>/<video>/<audio> src directly). Edit
// hands off to the Image/Video editor by kind (never the code editor); falls
// back to that handoff if the format can't render.
export function RemoteView({ file }: { file: RemoteFile }) {
  // Remember WHICH path failed — a different file derives back to "no error"
  // without an effect-driven reset (react-hooks/set-state-in-effect).
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const failed = failedPath === file.path;
  const setFailed = (v: boolean) => setFailedPath(v ? file.path : null);
  const src = rawUrl(file.path);
  const editor = editorFor(file.kind); // image → Image Editor, video/audio → Video Editor

  const openInEditor = () => {
    if (!editor) return;
    openWindow(editor.app, file.name, undefined, {
      path: file.path,
      name: file.name,
      kind: file.kind,
    });
  };

  usePublishInspector(
    "media-viewer",
    {
      subject: file.name,
      props: [
        { label: "Type", value: file.kind },
        { label: "Source", value: file.path },
      ],
      actions: editor
        ? [{ id: "edit", label: `Open in ${editor.label}`, run: openInEditor }]
        : [],
      context: `Viewing ${file.name} (${file.kind})`,
      suggestions: ["Describe this", "Suggest edits", "What format is best?"],
    },
    [file.path, file.name, file.kind, editor?.app],
  );

  const Icon =
    file.kind === "video" ? Film : file.kind === "audio" ? Music : file.kind === "pdf" ? FileText : ImageIcon;
  const isPdf = file.kind === "pdf";

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex items-center gap-2 border-b bg-background/60 px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{file.name}</span>
        <Badge variant="secondary" className="font-mono text-[10px] uppercase">
          {file.kind}
        </Badge>
        {editor && (
          <Button size="sm" variant="ghost" onClick={openInEditor} aria-label={`Open in ${editor.label}`}>
            <Pencil className="size-3.5" />
          </Button>
        )}
      </header>

      {/* PDF fills the window edge-to-edge; visual media sits on a padded
          checkerboard stage and scales to fit (up or down). */}
      <div
        className={cn(
          "flex min-h-0 flex-1",
          isPdf ? "" : cn("items-center justify-center overflow-hidden p-3", STAGE),
        )}
      >
        {failed ? (
          <FallbackCard name={file.name} Icon={Icon} editorLabel={editor?.label} onOpen={openInEditor} />
        ) : file.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={file.name}
            onError={() => setFailed(true)}
            className="h-full w-full object-contain"
          />
        ) : file.kind === "video" ? (
          <video
            src={src}
            controls
            onError={() => setFailed(true)}
            className="h-full w-full object-contain"
          />
        ) : file.kind === "audio" ? (
          <div className="flex w-full max-w-lg flex-col items-center gap-4 rounded-2xl border bg-card/80 p-6 shadow-2xl backdrop-blur">
            <div className="grid size-14 place-items-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
              <Music className="size-7" />
            </div>
            <div className="w-full truncate text-center text-sm font-semibold">{file.name}</div>
            <audio src={src} controls onError={() => setFailed(true)} className="w-full" />
          </div>
        ) : (
          // pdf (and anything else routed here) → full-bleed embed
          <iframe src={src} title={file.name} className="h-full w-full border-0 bg-white" />
        )}
      </div>
    </div>
  );
}

function FallbackCard({
  name,
  Icon,
  editorLabel,
  onOpen,
}: {
  name: string;
  Icon: typeof ImageIcon;
  editorLabel?: string;
  onOpen: () => void;
}) {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-xl border bg-card/80 p-8 text-center text-muted-foreground shadow-2xl backdrop-blur">
      <div className="grid size-14 place-items-center rounded-2xl bg-muted text-foreground">
        <Icon className="size-7" />
      </div>
      <div className="text-sm font-semibold text-foreground">{name}</div>
      <p className="max-w-[300px] text-xs leading-relaxed">
        {editorLabel
          ? "Couldn't preview this file here — open it in the editor."
          : "Couldn't preview this file here."}
      </p>
      {editorLabel && (
        <Button size="sm" variant="secondary" onClick={onOpen}>
          <Pencil className="size-3.5" />
          Open in {editorLabel}
        </Button>
      )}
    </div>
  );
}

// Extract a `{ path, name, kind }` remote-file from the window payload.
export function remoteFile(payload: unknown): RemoteFile | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Partial<RemoteFile>;
  if (typeof p.path !== "string" || !p.path) return null;
  const kind: MediaKind = (["image", "video", "audio", "pdf"] as const).includes(p.kind as MediaKind)
    ? (p.kind as MediaKind)
    : "image";
  return { path: p.path, name: p.name ?? p.path, kind };
}
