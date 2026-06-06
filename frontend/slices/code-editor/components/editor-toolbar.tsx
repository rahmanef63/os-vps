"use client";
// audit-allow-hex: VS-Code-dark editor chrome palette is the slice's design, not themable tokens.

import { PanelLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Lang } from "../lib/highlight";

export function EditorToolbar({
  lang,
  dirty,
  canSave,
  onOpenExplorer,
  onSave,
}: {
  lang: Lang;
  dirty: boolean;
  canSave: boolean;
  onOpenExplorer: () => void;
  onSave: () => void;
}) {
  return (
    <header className="flex items-center gap-2 border-b border-[#2a2a30] bg-[#16161a] px-2 py-1.5">
      {/* Explorer opens as a left Sheet when the rail is hidden (narrow). */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Open Explorer"
        onClick={onOpenExplorer}
        className={cn(
          "size-7 place-items-center rounded-md p-0 text-[#9aa0aa] hover:bg-[#2a2a30]",
          "hidden @max-[600px]:grid",
        )}
      >
        <PanelLeft className="size-4" />
      </Button>
      <div className="ml-auto flex items-center gap-2">
        <Badge variant="secondary" className="font-mono text-[10px] uppercase">
          {lang}
        </Badge>
        <Button size="sm" onClick={onSave} disabled={!canSave || !dirty}>
          <Save />
          Save
        </Button>
      </div>
    </header>
  );
}
