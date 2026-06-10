import { type DragEvent } from "react";
import { ChevronRight, PanelLeft, Plus, Upload, FolderUp, FileUp, LayoutGrid, List, ArrowUpDown, ClipboardPaste } from "lucide-react";
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
  dropTarget: string | null;
  onCrumbDragOver: (e: DragEvent, dest: string) => void;
  onCrumbDragLeave: (dest: string) => void;
  onCrumbDrop: (e: DragEvent, dest: string) => void;
}) {
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
        <Button variant="ghost" size="icon" aria-label="Grid view" onClick={() => props.onView("grid")} className={cn("size-6", props.view === "grid" && "bg-background shadow-sm")}>
          <LayoutGrid className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="List view" onClick={() => props.onView("list")} className={cn("size-6", props.view === "list" && "bg-background shadow-sm")}>
          <List className="size-3.5" />
        </Button>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Sort" className="size-7">
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
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={props.onPaste}>
          <ClipboardPaste className="size-3.5" />
          <span className="@max-[430px]:hidden">Paste</span>
        </Button>
      )}
      <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={props.onNewFolder}>
        <Plus className="size-3.5" />
        <span className="@max-[430px]:hidden">New</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" className="h-7 gap-1.5 px-2 text-xs">
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
