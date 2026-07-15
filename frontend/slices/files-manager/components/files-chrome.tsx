"use client";

import { FilesToolbar } from "./files-toolbar";
import { UploadBar } from "./upload-bar";
import { FileDetails } from "./file-details";
import type { useFiles } from "../hooks/use-files";
import type { useFileCommands } from "../hooks/use-file-commands";
import type { useDnd } from "../hooks/use-dnd";
import type { FsEntry } from "../lib/host";
import type { SortKey, ViewMode } from "../lib/types";

type Fs = ReturnType<typeof useFiles>;
type Cmd = ReturnType<typeof useFileCommands>;
type Dnd = ReturnType<typeof useDnd>;

// Toolbar header: nav + view/sort + new/upload, then UploadBar, then error.
// Extracted from app.tsx purely to keep that file ≤200 LOC; no behavior change.
export function FilesHeader({
  ios, fs, cmd, dnd, view, sort, setView, setSort, openPicker, openFolderPicker, openSidebar, clearSel,
  selectedCount, onDownload,
}: {
  ios: boolean;
  fs: Fs; cmd: Cmd; dnd: Dnd;
  view: ViewMode; sort: SortKey;
  setView: (v: ViewMode) => void;
  setSort: (s: SortKey) => void;
  openPicker: () => void;
  openFolderPicker: () => void;
  openSidebar: () => void;
  clearSel: () => void;
  selectedCount: number;
  onDownload: () => void;
}) {
  return (
    <>
      <FilesToolbar
        ios={ios}
        path={fs.path}
        canBack={fs.canBack}
        canForward={fs.canForward}
        view={view}
        sort={sort}
        hasClipboard={!!fs.clip}
        onBack={() => { fs.goBack(); clearSel(); }}
        onForward={() => { fs.goForward(); clearSel(); }}
        onNavigate={cmd.go}
        onView={setView}
        onSort={setSort}
        onNewFolder={cmd.newFolder}
        onUpload={openPicker}
        onUploadFolder={openFolderPicker}
        onPaste={fs.paste}
        onOpenSidebar={openSidebar}
        selectedCount={selectedCount}
        onDownload={onDownload}
        dropTarget={dnd.dropTarget}
        onCrumbDragOver={dnd.onDragOver}
        onCrumbDragLeave={dnd.onDragLeave}
        onCrumbDrop={dnd.onDrop}
      />
      <UploadBar />
      {fs.error && (
        <div className="border-t border-destructive/30 bg-destructive/10 px-3 py-1 text-[11px] text-destructive">
          {fs.error}
        </div>
      )}
    </>
  );
}

// Footer: optional FileDetails + counts/clipboard hint.
export function FilesFooter({
  fs, isMobile, selectedEntry, orderedLen, selectedCount,
}: {
  fs: Fs;
  isMobile: boolean;
  selectedEntry: FsEntry | null;
  orderedLen: number | null;
  selectedCount: number;
}) {
  return (
    <>
      {!isMobile && <FileDetails entry={selectedEntry} dir={fs.path} />}
      <div className="flex items-center gap-3 px-3 pt-1.5 text-[11px] text-muted-foreground [padding-bottom:calc(0.375rem+var(--sai-bottom))]">
        <span>{orderedLen !== null ? `${orderedLen} items` : "—"}</span>
        {selectedCount > 0 && <span>{selectedCount} selected</span>}
        {fs.clip && (
          <span className="ml-auto">
            {fs.clip.names.length} {fs.clip.mode === "cut" ? "cut" : "copied"} — ⌘V to paste
          </span>
        )}
      </div>
    </>
  );
}
