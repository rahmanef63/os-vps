import { type DragEvent, type MouseEvent } from "react";
import type { FsEntry } from "@/lib/os-api";
import { FileItem } from "./file-item";
import { joinPath } from "../lib/format";
import type { ViewMode } from "../lib/types";
import type { UseDnd } from "../hooks/use-dnd";

export function FileView({
  entries,
  view,
  dir,
  selected,
  cutNames,
  renaming,
  dnd,
  onItemClick,
  onOpen,
  onContext,
  onRename,
  onRenameCancel,
}: {
  entries: FsEntry[];
  view: ViewMode;
  dir: string;
  selected: Set<string>;
  cutNames: Set<string>;
  renaming: string | null;
  dnd: UseDnd;
  onItemClick: (e: MouseEvent, entry: FsEntry, index: number) => void;
  onOpen: (entry: FsEntry) => void;
  onContext: (e: MouseEvent, entry: FsEntry) => void;
  onRename: (from: string, to: string) => void;
  onRenameCancel: () => void;
}) {
  // Background drop = upload into the current dir (folders bubble-stop their own).
  const bgDrop = {
    onDragOver: (e: DragEvent) => dnd.onDragOver(e, dir),
    onDragLeave: () => dnd.onDragLeave(dir),
    onDrop: (e: DragEvent) => dnd.onDrop(e, dir),
  };
  const bgRing = dnd.dropTarget === dir ? "rounded-lg ring-2 ring-inset ring-primary/60" : "";

  if (entries.length === 0) {
    return (
      <div
        {...bgDrop}
        className={`flex h-full items-center justify-center p-8 text-center text-xs text-muted-foreground ${bgRing}`}
      >
        Drop files or folders here to upload
      </div>
    );
  }

  const rows = entries.map((entry, i) => {
    const dest = entry.kind === "dir" ? joinPath(dir, entry.name) : "";
    return (
      <FileItem
        key={entry.name}
        entry={entry}
        view={view}
        dirPath={dir}
        selected={selected.has(entry.name)}
        cut={cutNames.has(entry.name)}
        renaming={renaming === entry.name}
        dropActive={!!dest && dnd.dropTarget === dest}
        onClick={(e) => onItemClick(e, entry, i)}
        onOpen={() => onOpen(entry)}
        onContext={(e) => onContext(e, entry)}
        onRename={(to) => onRename(entry.name, to)}
        onRenameCancel={onRenameCancel}
        onDragStart={(e) => dnd.onDragStart(e, entry)}
        onDragOver={(e) => dnd.onDragOver(e, dest)}
        onDragLeave={() => dnd.onDragLeave(dest)}
        onDrop={(e) => dnd.onDrop(e, dest)}
      />
    );
  });

  if (view === "grid") {
    return (
      <div
        {...bgDrop}
        className={`@container grid min-h-full grid-cols-3 content-start gap-2 p-3 sm:grid-cols-4 @max-[430px]:grid-cols-2 ${bgRing}`}
      >
        {rows}
      </div>
    );
  }

  return (
    <div {...bgDrop} className={`min-h-full py-1 ${bgRing}`}>
      <div className="grid grid-cols-[1fr_92px_96px] gap-2 border-b border-border px-3 pb-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase @max-[430px]:grid-cols-[1fr_72px]">
        <span>Name</span>
        <span>Size</span>
        <span className="@max-[430px]:hidden">Kind</span>
      </div>
      {rows}
    </div>
  );
}
