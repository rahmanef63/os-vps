"use client";

import { createElement, type DragEvent, type MouseEvent, useState } from "react";
import { Folder } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { rawUrl, type FsEntry } from "../lib/host";
import { iconFor, colorFor, isImage } from "../lib/icons";
import { fmtSize, joinPath } from "../lib/format";
import type { ViewMode } from "../lib/types";

function RenameInput({
  initial,
  onCommit,
  onCancel,
  centered,
}: {
  initial: string;
  onCommit: (v: string) => void;
  onCancel: () => void;
  centered?: boolean;
}) {
  return (
    <Input
      autoFocus
      defaultValue={initial}
      // Pre-select so typing replaces the name immediately (Finder-style).
      onFocus={(e) => e.currentTarget.select()}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onBlur={(e) => onCommit(e.currentTarget.value)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") onCancel();
      }}
      className={cn("h-6 px-1 py-0 text-xs", centered && "text-center")}
    />
  );
}

export function FileItem({
  entry,
  view,
  dirPath,
  selected,
  cut,
  renaming,
  dropActive,
  onClick,
  onOpen,
  onContext,
  onRename,
  onRenameCancel,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  entry: FsEntry;
  view: ViewMode;
  dirPath?: string;
  selected: boolean;
  cut: boolean;
  renaming: boolean;
  dropActive?: boolean;
  onClick: (e: MouseEvent) => void;
  onOpen: () => void;
  onContext: (e: MouseEvent) => void;
  onRename: (to: string) => void;
  onRenameCancel: () => void;
  onDragStart: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent) => void;
}) {
  const color = colorFor(entry);
  const isMobile = useIsMobile();
  const [thumbFail, setThumbFail] = useState(false);
  // Touch has no double-click — on phones a single tap selects AND opens
  // (navigate for dirs, preview for files). Desktop keeps select / dbl-open.
  const onTap = (e: MouseEvent) => {
    onClick(e);
    if (isMobile) onOpen();
  };
  const showThumb = view === "grid" && !!dirPath && isImage(entry) && !thumbFail;
  const commit = (v: string) => {
    const t = v.trim();
    if (t && t !== entry.name) onRename(t);
    else onRenameCancel();
  };
  const isDir = entry.kind === "dir";
  const dropProps = isDir
    ? { onDragOver, onDragLeave, onDrop }
    : {};

  if (view === "grid") {
    return (
      <button
        draggable
        onDragStart={onDragStart}
        {...dropProps}
        onClick={onTap}
        onDoubleClick={onOpen}
        onContextMenu={onContext}
        className={cn(
          "flex h-auto w-full flex-col items-center gap-1.5 rounded-lg p-3 text-center transition-colors",
          selected ? "bg-primary text-primary-foreground" : "hover:bg-accent",
          cut && "opacity-50",
          dropActive && "ring-2 ring-primary ring-inset",
        )}
      >
        {showThumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={rawUrl(joinPath(dirPath!, entry.name))}
            alt=""
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            onError={() => setThumbFail(true)}
            className={cn(
              "size-11 shrink-0 rounded-md object-cover shadow-[0_2px_6px_rgba(0,0,0,0.22)] transition-transform",
              dropActive && "scale-110",
            )}
          />
        ) : isDir ? (
          // Finder/Files-style filled folder — fill-current is the accent when
          // idle, primary-foreground when the tile is selected — with a soft
          // drop shadow so folders read as the dominant grid object.
          <Folder
            className={cn(
              "size-12 shrink-0 fill-current drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform",
              selected ? "" : "text-primary",
              dropActive && "scale-110",
            )}
          />
        ) : (
          // createElement: dynamic stateless lookup, not a render-created component
          createElement(iconFor(entry), {
            className: cn(
              "size-11 shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)] transition-transform",
              selected ? "" : color,
              dropActive && "scale-110",
            ),
          })
        )}
        {renaming ? (
          <RenameInput initial={entry.name} onCommit={commit} onCancel={onRenameCancel} centered />
        ) : (
          <span className="line-clamp-2 w-full text-[11px] font-medium leading-tight break-words whitespace-normal">
            {entry.name}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      {...dropProps}
      onClick={onTap}
      onDoubleClick={onOpen}
      onContextMenu={onContext}
      className={cn(
        "grid cursor-default grid-cols-[1fr_92px_96px] items-center gap-2 px-3 py-1.5 text-xs transition-colors @max-[430px]:grid-cols-[1fr_72px]",
        selected ? "bg-primary text-primary-foreground" : "hover:bg-accent",
        cut && "opacity-50",
        dropActive && "ring-2 ring-primary ring-inset",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {/* createElement: dynamic stateless lookup, not a render-created component */}
        {createElement(iconFor(entry), { className: cn("size-4 shrink-0", selected ? "" : color) })}
        {renaming ? (
          <RenameInput initial={entry.name} onCommit={commit} onCancel={onRenameCancel} />
        ) : (
          <span className="truncate">{entry.name}</span>
        )}
      </span>
      <span className="tabular-nums opacity-70">{entry.kind === "dir" ? "—" : fmtSize(entry.size)}</span>
      <span className="truncate opacity-70 @max-[430px]:hidden">
        {entry.kind === "dir" ? "Folder" : (entry.ext ?? "").toUpperCase() || "File"}
      </span>
    </div>
  );
}
