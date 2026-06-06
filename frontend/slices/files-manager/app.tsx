"use client";

import { useMemo, useRef, useState, type DragEvent } from "react";
import { Upload } from "lucide-react";
import { AppFrame, AppSidebar, usePublishInspector, type AppProps } from "@/features/os-shell";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FilesSidebar } from "./components/files-sidebar";
import { FilesToolbar } from "./components/files-toolbar";
import { FileView } from "./components/file-view";
import { FileContextMenu } from "./components/file-context-menu";
import { FileDetails } from "./components/file-details";
import { UploadInput } from "./components/upload-input";
import { useFiles } from "./hooks/use-files";
import { useFileSelection } from "./hooks/use-file-selection";
import { useFileCommands } from "./hooks/use-file-commands";
import { useDnd } from "./hooks/use-dnd";
import { fmtGiB } from "./lib/format";
import { sortEntries, type SortKey, type ViewMode } from "./lib/types";

// Optional `{ path }` payload (e.g. from Spotlight) opens the manager there.
function initialPath(payload: unknown): string | undefined {
  if (payload && typeof payload === "object" && "path" in payload) {
    const p = (payload as { path?: unknown }).path;
    if (typeof p === "string" && p) return p;
  }
  return undefined;
}

export default function FilesManager({ payload }: AppProps) {
  const fs = useFiles(initialPath(payload));
  const sel = useFileSelection(fs.entries);
  const cmd = useFileCommands(fs, sel);
  const dnd = useDnd(sel.selected, sel.selectOne, fs.move, fs.upload);
  const uploadRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<SortKey>("name");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const ordered = useMemo(
    () => (fs.entries ? sortEntries(fs.entries, sort) : null),
    [fs.entries, sort],
  );
  const cutNames =
    fs.clip?.mode === "cut" && fs.clip.from === fs.path
      ? new Set(fs.clip.names)
      : new Set<string>();
  const selectedEntry =
    sel.selected.size === 1
      ? (fs.entries?.find((e) => sel.selected.has(e.name)) ?? null)
      : null;
  const openPicker = () => uploadRef.current?.click();
  const openFolderPicker = () => folderRef.current?.click();

  // Window-wide drop zone so a dragged file/folder lands anywhere in the app
  // (not just on the grid) — without this, a drop on the toolbar/sidebar/empty
  // padding falls through to the browser, which just opens the folder.
  const [dragActive, setDragActive] = useState(false);
  const isFileDrag = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");
  const onWinDragOver = (e: DragEvent) => {
    if (!isFileDrag(e)) return; // ignore internal item moves at the window level
    dnd.onDragOver(e, fs.path);
    setDragActive(true);
  };
  const onWinDragLeave = (e: DragEvent) => {
    if (e.relatedTarget === null) setDragActive(false); // left the window entirely
  };
  const onWinDrop = (e: DragEvent) => {
    setDragActive(false);
    if (isFileDrag(e)) dnd.onDrop(e, fs.path);
  };

  const entryCount = fs.entries?.length ?? 0;
  const selectedCount = sel.selected.size;
  const usageStr = fs.usage
    ? `${fmtGiB(fs.usage.used)} of ${fmtGiB(fs.usage.total)}`
    : "—";

  // Publish this app's live state to the shell AI Inspector. Re-runs when the
  // current dir, item count, or selection changes; cleared on unmount.
  usePublishInspector(
    "files-manager",
    {
      subject: fs.path,
      props: [
        { label: "Path", value: fs.path },
        { label: "Items", value: String(entryCount) },
        { label: "Selected", value: String(selectedCount) },
        { label: "Storage", value: usageStr },
      ],
      actions: [
        { id: "newfolder", label: "New folder", run: () => fs.mkdir() },
        { id: "refresh", label: "Refresh", run: () => fs.refresh() },
        { id: "trash", label: "Empty Trash", run: () => cmd.emptyTrash() },
      ],
      context: `File manager browsing ${fs.path} with ${entryCount} items.`,
      suggestions: ["What's taking space?", "Organize this folder", "Find large files"],
    },
    [fs.path, entryCount, selectedCount],
  );

  return (
    <div
      className="relative flex h-full outline-none"
      tabIndex={0}
      onKeyDown={cmd.onKey}
      onDragOver={onWinDragOver}
      onDragLeave={onWinDragLeave}
      onDrop={onWinDrop}
    >
      {dragActive && (
        <div className="pointer-events-none absolute inset-0 z-[60] m-2 grid place-items-center rounded-xl border-2 border-dashed border-primary bg-primary/10 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-2 text-primary">
            <Upload className="size-7" />
            <span className="text-sm font-semibold">Drop files &amp; folders to upload</span>
          </div>
        </div>
      )}
      {/* Left nav: inline rail on wide windows, left Sheet on narrow/mobile. */}
      <AppSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        title="Files"
        description="Browse favorites, the file tree, and storage."
      >
        <FilesSidebar
          path={fs.path}
          roots={fs.roots}
          usage={fs.usage}
          dropTarget={dnd.dropTarget}
          onNavigate={(p) => { cmd.go(p); setSidebarOpen(false); }}
          onOpenFile={(p) => { cmd.openPath(p); setSidebarOpen(false); }}
          onEmptyTrash={cmd.emptyTrash}
          onDragOver={dnd.onDragOver}
          onDragLeave={dnd.onDragLeave}
          onDrop={dnd.onDrop}
        />
      </AppSidebar>
      <AppFrame
        className="min-w-0 flex-1"
        safeArea={false}
        toolbar={
          <>
            <FilesToolbar
              path={fs.path}
              canBack={fs.canBack}
              canForward={fs.canForward}
              view={view}
              sort={sort}
              hasClipboard={!!fs.clip}
              onBack={() => { fs.goBack(); sel.clear(); }}
              onForward={() => { fs.goForward(); sel.clear(); }}
              onNavigate={cmd.go}
              onView={setView}
              onSort={setSort}
              onNewFolder={cmd.newFolder}
              onUpload={openPicker}
              onUploadFolder={openFolderPicker}
              onPaste={fs.paste}
              onOpenSidebar={() => setSidebarOpen(true)}
              dropTarget={dnd.dropTarget}
              onCrumbDragOver={dnd.onDragOver}
              onCrumbDragLeave={dnd.onDragLeave}
              onCrumbDrop={dnd.onDrop}
            />
            {fs.error && (
              <div className="border-t border-destructive/30 bg-destructive/10 px-3 py-1 text-[11px] text-destructive">
                {fs.error}
              </div>
            )}
          </>
        }
        footer={
          <>
            <FileDetails entry={selectedEntry} dir={fs.path} />
            <div className="flex items-center gap-3 px-3 pt-1.5 text-[11px] text-muted-foreground [padding-bottom:calc(0.375rem+var(--sai-bottom))]">
              <span>{ordered ? `${ordered.length} items` : "—"}</span>
              {sel.selected.size > 0 && <span>{sel.selected.size} selected</span>}
              {fs.clip && (
                <span className="ml-auto">
                  {fs.clip.names.length} {fs.clip.mode === "cut" ? "cut" : "copied"} — ⌘V to paste
                </span>
              )}
            </div>
          </>
        }
      >
        <ScrollArea
          className="h-full"
          onClick={() => sel.clear()}
          onContextMenu={(e) => cmd.onContext(e, null)}
        >
          {ordered === null ? (
            <div className="flex h-full items-center justify-center p-8 text-xs text-muted-foreground">
              Loading…
            </div>
          ) : (
            <FileView
              entries={ordered}
              view={view}
              dir={fs.path}
              selected={sel.selected}
              cutNames={cutNames}
              renaming={cmd.renaming}
              dnd={dnd}
              onItemClick={sel.onItemClick}
              onOpen={cmd.open}
              onContext={cmd.onContext}
              onRename={cmd.doRename}
              onRenameCancel={() => cmd.setRenaming(null)}
            />
          )}
        </ScrollArea>
      </AppFrame>

      {cmd.ctx && (
        <FileContextMenu
          ctx={cmd.ctx}
          hasClipboard={!!fs.clip}
          inTrash={cmd.inTrash}
          onClose={() => cmd.setCtx(null)}
          onOpen={() => cmd.ctx?.entry && cmd.open(cmd.ctx.entry)}
          onRename={() => cmd.ctx?.entry && cmd.setRenaming(cmd.ctx.entry.name)}
          onNewFolder={cmd.newFolder}
          onUpload={openPicker}
          onUploadFolder={openFolderPicker}
          onCut={() => cmd.cut(cmd.targets())}
          onCopy={() => cmd.copy(cmd.targets())}
          onPaste={fs.paste}
          onDownload={() => fs.setError(null)}
          onDelete={() => cmd.del(cmd.targets())}
        />
      )}
      <UploadInput ref={uploadRef} onFiles={fs.upload} />
      <UploadInput ref={folderRef} onFiles={fs.upload} directory />
    </div>
  );
}
