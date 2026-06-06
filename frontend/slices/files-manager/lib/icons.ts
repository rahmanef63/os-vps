import {
  Folder, FileText, Image, Code2, FileVideo, Music, FileArchive,
  FileJson, FileSpreadsheet, Terminal, Globe, type LucideIcon,
} from "lucide-react";
import type { FsEntry } from "@/lib/os-api";

const IMAGE = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"]);
const VIDEO = new Set(["mp4", "mov", "webm", "avi", "mkv"]);
const AUDIO = new Set(["mp3", "wav", "aiff", "m4a", "flac"]);
const CODE = new Set(["ts", "tsx", "js", "jsx", "py", "go", "rs", "css"]);
const ARCHIVE = new Set(["zip", "gz", "tar", "rar", "7z"]);

// Map an entry to its display icon. Dirs always Folder; files by ext.
export function iconFor(entry: FsEntry): LucideIcon {
  if (entry.kind === "dir") return Folder;
  const ext = entry.ext?.toLowerCase() ?? "";
  if (IMAGE.has(ext)) return Image;
  if (VIDEO.has(ext)) return FileVideo;
  if (AUDIO.has(ext)) return Music;
  if (ext === "json") return FileJson;
  if (ext === "csv") return FileSpreadsheet;
  if (ext === "sh") return Terminal;
  if (ext === "html") return Globe;
  if (CODE.has(ext)) return Code2;
  if (ARCHIVE.has(ext)) return FileArchive;
  return FileText;
}

// Tailwind text-color class keyed by ext family — color-coded icons. Uses
// palette utilities (not hex) so it tracks the active theme.
export function colorFor(entry: FsEntry): string {
  if (entry.kind === "dir") return "text-primary";
  const ext = entry.ext?.toLowerCase() ?? "";
  if (IMAGE.has(ext)) return "text-amber-500";
  if (VIDEO.has(ext)) return "text-pink-500";
  if (AUDIO.has(ext)) return "text-emerald-500";
  if (ext === "json") return "text-slate-400";
  if (ext === "csv") return "text-green-500";
  if (ext === "pdf") return "text-red-500";
  if (ARCHIVE.has(ext)) return "text-violet-400";
  if (CODE.has(ext) || ext === "sh" || ext === "html") return "text-sky-400";
  return "text-muted-foreground";
}

// Which OS app opens this file (by ext) — used to route openWindow.
export function appForFile(entry: FsEntry): "media-viewer" | "code-editor" | null {
  if (entry.kind === "dir") return null;
  const ext = entry.ext?.toLowerCase() ?? "";
  if (IMAGE.has(ext) || VIDEO.has(ext) || AUDIO.has(ext) || ext === "pdf") return "media-viewer";
  if (CODE.has(ext) || ["json", "md", "txt", "html", "sh"].includes(ext)) return "code-editor";
  return null;
}

// True for raster/vector image files — used to show a real thumbnail in grid
// view (rendered via /api/v1/fs/raw) instead of a generic icon.
export function isImage(entry: FsEntry): boolean {
  return entry.kind === "file" && IMAGE.has(entry.ext?.toLowerCase() ?? "");
}

// Media kind for the media-viewer payload (by ext family).
export type MediaKind = "image" | "video" | "audio" | "pdf";
export function mediaKind(entry: FsEntry): MediaKind {
  const ext = entry.ext?.toLowerCase() ?? "";
  if (VIDEO.has(ext)) return "video";
  if (AUDIO.has(ext)) return "audio";
  if (ext === "pdf") return "pdf";
  return "image";
}
