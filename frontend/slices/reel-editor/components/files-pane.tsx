"use client";

import { useCallback, useEffect, useState } from "react";
import { Folder, FileVideo, FileAudio, FileImage, CornerLeftUp, Loader2, FolderOpen, Copy, FolderInput } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "../lib/host";
import { useOsApi, type FsList } from "../lib/host";
import { rawUrl } from "../lib/host";
import { useImport } from "../lib/use-import";
import { getSettings } from "../lib/settings";
import type { MediaRef } from "../lib/mock-timeline";
import { mediaTypeOf } from "./file-browser";

const join = (dir: string, name: string) => (dir.endsWith("/") ? dir + name : `${dir}/${name}`);
const ICON = { image: FileImage, video: FileVideo, audio: FileAudio };

// Quick-import pane: a persistent project file browser (same fs source as the
// File-menu dialog — live VPS or the demo mock whose "Media" root is real).
// Click a media file and it lands on the timeline at the playhead.
export function FilesPane({ onAdd }: { onAdd: (m: MediaRef, name: string) => void }) {
  const api = useOsApi();
  const { add } = useImport(onAdd);
  const [data, setData] = useState<FsList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const load = useCallback(
    async (p: string) => {
      setLoading(true);
      setError(null);
      try {
        setData(await api.fs.list(p));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Cannot read folder");
      } finally {
        setLoading(false);
      }
    },
    [api],
  );

  // Open in the project media folder (editor setting, default
  // ~/reel-projects/session) — create it on first use; fall back to home.
  useEffect(() => {
    void (async () => {
      const base = getSettings().projectDir;
      try {
        await api.fs.list(base);
        return void load(base);
      } catch {
        /* missing — try to create it */
      }
      try {
        await api.fs.mkdir(base);
        return void load(base);
      } catch {
        return void load("~");
      }
    })();
  }, [api, load]);

  const path = data?.path ?? "~";
  const entries = (data?.entries ?? [])
    .filter((e) => e.kind === "dir" || mediaTypeOf(e))
    .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "dir" ? -1 : 1));

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <header className="flex items-center gap-1.5 border-b border-border px-2.5 py-1.5">
        <FolderOpen className="size-3.5 text-primary" />
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Project files</span>
      </header>

      {!!data?.roots?.length && (
        <div className="flex flex-wrap gap-1 border-b border-border px-2 py-1.5">
          {data.roots.map((r) => (
            <Button
              key={r.path}
              type="button"
              variant="ghost"
              onClick={() => void load(r.path)}
              className="h-5 rounded-md bg-secondary px-1.5 text-[10px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {r.label}
            </Button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5 border-b border-border px-2 py-1">
        <Button
          type="button"
          variant="ghost"
          disabled={!data?.parent}
          onClick={() => data?.parent && void load(data.parent)}
          className="grid size-5 shrink-0 place-items-center rounded bg-secondary p-0 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40"
          aria-label="Up"
        >
          <CornerLeftUp className="size-3" />
        </Button>
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim()) {
                setEditing(false);
                void load(draft.trim());
              } else if (e.key === "Escape") setEditing(false);
            }}
            placeholder="/path/to/folder"
            className="h-5 min-w-0 flex-1 rounded border border-border bg-secondary px-1.5 font-mono text-[10px] text-foreground outline-none focus:ring-1 focus:ring-ring"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-muted-foreground" title={path}>
            {path}
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          title="Go to folder…"
          aria-label="Go to folder"
          onClick={() => {
            setDraft(path);
            setEditing(true);
          }}
          className="grid size-5 shrink-0 place-items-center rounded bg-secondary p-0 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <FolderInput className="size-3" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="grid h-full place-items-center text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : error ? (
          <div className="grid h-full place-items-center px-4 text-center text-[11px] text-red-500">{error}</div>
        ) : entries.length === 0 ? (
          <div className="grid h-full place-items-center text-[11px] text-muted-foreground">No media here</div>
        ) : (
          entries.map((e) => {
            const mt = e.kind === "file" ? mediaTypeOf(e) : null;
            const Icon = mt ? ICON[mt] : Folder;
            const full = join(path, e.name);
            return (
              <Button
                key={e.name}
                type="button"
                variant="ghost"
                title={mt ? `Add ${e.name} at the playhead` : e.name}
                onClick={() => (e.kind === "dir" ? void load(full) : mt && void add(rawUrl(full), mt, e.name))}
                className="flex h-auto w-full items-center justify-start gap-2 rounded-none px-2.5 py-1 text-left text-xs font-normal hover:bg-accent"
              >
                <Icon className={cn("size-3.5 shrink-0", e.kind === "dir" ? "text-primary" : "text-muted-foreground")} />
                <span className="min-w-0 flex-1 truncate">{e.name}</span>
                {mt && <span className="text-[9px] uppercase text-muted-foreground">{mt}</span>}
              </Button>
            );
          })
        )}
      </div>

      <footer className="flex items-center gap-1.5 border-t border-border px-2 py-1">
        <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-muted-foreground" title={path}>
          {path}
        </span>
        <Button
          type="button"
          variant="ghost"
          title="Copy folder path"
          aria-label="Copy folder path"
          onClick={() => {
            void navigator.clipboard
              .writeText(path)
              .then(() => toast("Path copied", { tone: "success" }))
              .catch(() => toast("Copy failed", { tone: "error" }));
          }}
          className="grid size-5 shrink-0 place-items-center rounded bg-secondary p-0 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Copy className="size-3" />
        </Button>
      </footer>
    </div>
  );
}
