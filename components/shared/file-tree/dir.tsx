"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  File as FileIcon,
  FilePlus,
  FolderPlus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOsApi, type FsEntry } from "@/lib/os-api";
import { cn } from "@/lib/utils";

export type TreeCtx = {
  activePath?: string | null;
  onOpenFile?: (path: string) => void;
  onSelectDir?: (path: string) => void;
};

const join = (dir: string, name: string) => (dir === "/" ? "/" + name : dir + "/" + name);

// Lazily lists ONE directory via the OsApi (live VPS or mock) and renders its
// children + an inline create-file / create-folder affordance. Owns its own
// reload so a create refreshes just this dir. Mutually recursive with Node.
export function DirChildren({
  path,
  depth,
  ctx,
}: {
  path: string;
  depth: number;
  ctx: TreeCtx;
}) {
  const api = useOsApi();
  const [entries, setEntries] = useState<FsEntry[] | null>(null);
  // Canonical base the host resolved (e.g. "/" → "/home/rahman"). Child paths
  // MUST be built from this, not the requested `path`, or descending fails on a
  // live host (requested "/" + "projects" → "/projects" → outside roots).
  const [base, setBase] = useState(path);
  const [reload, setReload] = useState(0);
  const [adding, setAdding] = useState<null | "file" | "dir">(null);
  const [draft, setDraft] = useState("");
  const pad = 8 + depth * 12;

  useEffect(() => {
    let alive = true;
    setEntries(null);
    api.fs
      .list(path)
      .then((r) => {
        if (!alive) return;
        setBase(r.path || path);
        setEntries(r.entries);
      })
      .catch(() => alive && setEntries([]));
    return () => {
      alive = false;
    };
  }, [api, path, reload]);

  const create = async () => {
    const name = draft.trim();
    setAdding(null);
    setDraft("");
    if (!name) return;
    try {
      if (adding === "dir") await api.fs.mkdir(join(base, name));
      else await api.fs.write(join(base, name), "");
      setReload((n) => n + 1);
    } catch {
      /* read-only host / error — silently ignore in the tree */
    }
  };

  if (entries === null)
    return (
      <div style={{ paddingLeft: pad }} className="flex items-center gap-1.5 py-1 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> loading…
      </div>
    );

  return (
    <div>
      {entries.map((e) => (
        <Node key={e.name} entry={e} parent={base} depth={depth} ctx={ctx} />
      ))}

      {adding ? (
        <div style={{ paddingLeft: pad + 14 }} className="flex items-center gap-1 py-0.5 pr-2">
          <input
            autoFocus
            value={draft}
            onChange={(ev) => setDraft(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter") void create();
              if (ev.key === "Escape") {
                setAdding(null);
                setDraft("");
              }
            }}
            onBlur={() => void create()}
            placeholder={adding === "dir" ? "folder name" : "file name"}
            className="w-full rounded border border-border bg-background px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      ) : (
        <div style={{ paddingLeft: pad + 14 }} className="flex items-center gap-1 py-0.5 opacity-0 hover:opacity-100 focus-within:opacity-100">
          <Button type="button" variant="ghost" size="icon" title="New file" onClick={() => setAdding("file")} className="grid size-5 place-items-center rounded p-0 text-muted-foreground hover:bg-secondary">
            <FilePlus className="size-3" />
          </Button>
          <Button type="button" variant="ghost" size="icon" title="New folder" onClick={() => setAdding("dir")} className="grid size-5 place-items-center rounded p-0 text-muted-foreground hover:bg-secondary">
            <FolderPlus className="size-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

function Node({ entry, parent, depth, ctx }: { entry: FsEntry; parent: string; depth: number; ctx: TreeCtx }) {
  const [open, setOpen] = useState(false);
  const path = join(parent, entry.name);
  const pad = { paddingLeft: 8 + depth * 12 };

  if (entry.kind === "file") {
    const on = ctx.activePath === path;
    return (
      <Button
        type="button"
        variant="ghost"
        onClick={() => ctx.onOpenFile?.(path)}
        style={pad}
        className={cn(
          "flex h-auto w-full items-center justify-start gap-1.5 rounded-none py-1 pr-2 text-left text-xs font-normal",
          on ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60",
        )}
      >
        <FileIcon className="size-3.5 shrink-0 opacity-70" />
        <span className="truncate">{entry.name}</span>
      </Button>
    );
  }

  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          setOpen((v) => !v);
          ctx.onSelectDir?.(path);
        }}
        style={pad}
        className="flex h-auto w-full items-center justify-start gap-1 rounded-none py-1 pr-2 text-left text-xs font-medium text-foreground hover:bg-secondary/60"
      >
        {open ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
        <span className="truncate">{entry.name}</span>
      </Button>
      {open ? <DirChildren path={path} depth={depth + 1} ctx={ctx} /> : null}
    </div>
  );
}
