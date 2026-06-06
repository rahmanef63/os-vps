"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { DirChildren, type TreeCtx } from "./dir";

// Reusable live file tree. Lazy-loads each directory through the OsApi (mock or
// the real VPS in Live mode) so it stays in sync with the host. Shared by the
// Files app sidebar and the code-editor explorer — one tree, two mounts.
export function FileTree({
  rootPath = "/",
  rootLabel = "Files",
  activePath = null,
  onOpenFile,
  onSelectDir,
  className,
}: {
  rootPath?: string;
  rootLabel?: string;
  className?: string;
} & TreeCtx) {
  // Remount the root subtree to force a full refresh (cheap: keyed DirChildren).
  const [nonce, setNonce] = useState(0);
  const ctx: TreeCtx = { activePath, onOpenFile, onSelectDir };

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="flex items-center gap-1 px-2.5 py-2">
        <span className="flex-1 truncate text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {rootLabel}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Refresh"
          onClick={() => setNonce((n) => n + 1)}
          className="grid size-6 place-items-center rounded p-0 text-muted-foreground hover:bg-secondary"
        >
          <RefreshCw className="size-3.5" />
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="pb-2">
          <DirChildren key={`${rootPath}:${nonce}`} path={rootPath} depth={0} ctx={ctx} />
        </div>
      </ScrollArea>
    </div>
  );
}
