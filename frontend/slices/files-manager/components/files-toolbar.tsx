import { type DragEvent } from "react";
import { ChevronRight, PanelLeft, Plus, Upload, Download, FolderUp, FileUp, LayoutGrid, List, ArrowUpDown, ClipboardPaste, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { FileCrumbs } from "./file-crumbs";
import type { SortKey, ViewMode } from "../lib/types";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "size", label: "Size" },
  { key: "kind", label: "Kind" },
];

export function FilesToolbar(props: {
  path: string;
  canBack: boolean;
  canForward: boolean;
  view: ViewMode;
  sort: SortKey;
  hasClipboard: boolean;
  onBack: () => void;
  onForward: () => void;
  onNavigate: (path: string) => void;
  onView: (v: ViewMode) => void;
  onSort: (s: SortKey) => void;
  onNewFolder: () => void;
  onUpload: () => void;
  onUploadFolder: () => void;
  onPaste: () => void;
  onOpenSidebar: () => void;
  selectedCount: number;
  onDownload: () => void;
  dropTarget: string | null;
  onCrumbDragOver: (e: DragEvent, dest: string) => void;
  onCrumbDragLeave: (dest: string) => void;
  onCrumbDrop: (e: DragEvent, dest: string) => void;
  onToggleSearch: () => void;
  searchOpen?: boolean;
  ios?: boolean;
}) {
  // iOS Files: a slim bar — tint back chevron + path + iOS grid/list segment +
  // a single "+" overflow menu (New/Upload/Paste/Download/Sort), instead of the
  // dense desktop cluster. Data flow is unchanged; only the chrome is adapted.
  if (props.ios) {
    return (
      <div className="flex h-11 items-center gap-1.5 border-b border-border px-3">
        {/* Browse: opens the Favorites / roots drawer — the slim bar must keep
            this or those locations become unreachable on the phone. */}
        <Button variant="ghost" size="icon" onClick={props.onOpenSidebar} aria-label="Browse" className="size-9 shrink-0 text-primary">
          <PanelLeft className="size-5" />
        </Button>
        <Button variant="ghost" size="icon" disabled={!props.canBack} onClick={props.onBack} aria-label="Back" className="size-9 shrink-0 text-primary disabled:text-muted-foreground">
          <ChevronRight className="size-5 rotate-180" />
        </Button>
        <FileCrumbs
          path={props.path}
          dropTarget={props.dropTarget}
          onNavigate={props.onNavigate}
          onDragOver={props.onCrumbDragOver}
          onDragLeave={props.onCrumbDragLeave}
          onDrop={props.onCrumbDrop}
        />
        <div className="ml-auto flex shrink-0 items-center rounded-[9px] bg-secondary p-0.5">
          <Button variant="ghost" size="icon" aria-label="Grid view" onClick={() => props.onView("grid")} className={cn("size-8 rounded-[7px]", props.view === "grid" && "bg-background shadow-sm")}>
            <LayoutGrid className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="List view" onClick={() => props.onView("list")} className={cn("size-8 rounded-[7px]", props.view === "list" && "bg-background shadow-sm")}>
            <List className="size-3.5" />
          </Button>
        </div>
        <Button variant="ghost" size="icon" aria-label="Search" onClick={props.onToggleSearch} className={cn("size-9 shrink-0 text-primary", props.searchOpen && "bg-secondary")}>
          <Search className="size-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More actions" className="size-9 shrink-0 text-primary">
              <Plus className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={props.onNewFolder}><Plus className="size-3.5" /> New Folder</DropdownMenuItem>
            <DropdownMenuItem onSelect={props.onUpload}><FileUp className="size-3.5" /> Upload Files…</DropdownMenuItem>
            <DropdownMenuItem onSelect={props.onUploadFolder}><FolderUp className="size-3.5" /> Upload Folder…</DropdownMenuItem>
            {props.hasClipboard && (
              <DropdownMenuItem onSelect={props.onPaste}><ClipboardPaste className="size-3.5" /> Paste</DropdownMenuItem>
            )}
            {props.selectedCount > 0 && (
              <DropdownMenuItem onSelect={props.onDownload}><Download className="size-3.5" /> Download ({props.selectedCount})</DropdownMenuItem>
            )}
            {SORTS.map((s) => (
              <DropdownMenuItem key={s.key} onSelect={() => props.onSort(s.key)} className={cn(props.sort === s.key && "text-primary")}>
                Sort: {s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }
  return (
    <div className="flex h-11 items-center gap-2 border-b border-border px-2">
      {/* Drawer toggle — only when the inline rail is hidden (narrow). */}
      <Button
        variant="ghost"
        size="icon"
        onClick={props.onOpenSidebar}
        aria-label="Open sidebar"
        className="hidden size-7 shrink-0 @max-[600px]:inline-flex [@media(pointer:coarse)]:size-9"
      >
        <PanelLeft className="size-4" />
      </Button>
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" disabled={!props.canBack} onClick={props.onBack} aria-label="Back" className="size-7 [@media(pointer:coarse)]:size-9">
          <ChevronRight className="size-4 rotate-180" />
        </Button>
        <Button variant="ghost" size="icon" disabled={!props.canForward} onClick={props.onForward} aria-label="Forward" className="size-7 [@media(pointer:coarse)]:size-9">
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <Separator orientation="vertical" className="h-5" />
      <FileCrumbs
        path={props.path}
        dropTarget={props.dropTarget}
        onNavigate={props.onNavigate}
        onDragOver={props.onCrumbDragOver}
        onDragLeave={props.onCrumbDragLeave}
        onDrop={props.onCrumbDrop}
      />
      <div className="flex items-center rounded-md bg-secondary p-0.5">
        <Button variant="ghost" size="icon" aria-label="Grid view" onClick={() => props.onView("grid")} className={cn("size-6 [@media(pointer:coarse)]:size-9", props.view === "grid" && "bg-background shadow-sm")}>
          <LayoutGrid className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="List view" onClick={() => props.onView("list")} className={cn("size-6 [@media(pointer:coarse)]:size-9", props.view === "list" && "bg-background shadow-sm")}>
          <List className="size-3.5" />
        </Button>
      </div>
      <Button variant="ghost" size="icon" aria-label="Search" onClick={props.onToggleSearch} className={cn("size-7 [@media(pointer:coarse)]:size-9", props.searchOpen && "bg-secondary")}>
        <Search className="size-3.5" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Sort" className="size-7 [@media(pointer:coarse)]:size-9">
            <ArrowUpDown className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {SORTS.map((s) => (
            <DropdownMenuItem key={s.key} onSelect={() => props.onSort(s.key)} className={cn(props.sort === s.key && "text-primary")}>
              {s.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {props.hasClipboard && (
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)]:min-w-9" onClick={props.onPaste}>
          <ClipboardPaste className="size-3.5" />
          <span className="@max-[430px]:hidden">Paste</span>
        </Button>
      )}
      <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2 text-xs [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)]:min-w-9" onClick={props.onNewFolder}>
        <Plus className="size-3.5" />
        <span className="@max-[430px]:hidden">New</span>
      </Button>
      {props.selectedCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)]:min-w-9"
          onClick={props.onDownload}
          aria-label={`Download ${props.selectedCount} selected`}
        >
          <Download className="size-3.5" />
          <span className="@max-[430px]:hidden">Download</span>
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" className="h-7 gap-1.5 px-2 text-xs [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)]:min-w-9">
            <Upload className="size-3.5" />
            <span className="@max-[430px]:hidden">Upload</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={props.onUpload}>
            <FileUp className="size-3.5" /> Upload Files…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={props.onUploadFolder}>
            <FolderUp className="size-3.5" /> Upload Folder…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
