"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Dep / build / VCS dirs that bloat an archive but are regenerable — offered as
// excludes and checked (skipped) by default. Excluding one the folder doesn't
// have is a harmless no-op, so we always show the full set rather than scanning.
// ponytail: no presence scan + no custom-pattern field; add them if this nags.
const HEAVY = ["node_modules", ".git", ".next", "dist", "build", ".cache", "__pycache__", ".venv"];

export function ZipDialog({
  open, count, filename, onClose, onConfirm,
}: {
  open: boolean;
  count: number;
  filename: string;
  onClose: () => void;
  onConfirm: (exclude: string[]) => void;
}) {
  // All heavy dirs start excluded; the choice persists across opens this session
  // (unchecking .git once keeps it included next time — no reset effect needed).
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set(HEAVY));

  function toggle(name: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Download as Zip</DialogTitle>
          <DialogDescription>
            {count} item{count > 1 ? "s" : ""} → {filename}. Skip heavy folders to shrink the archive.
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-64 space-y-0.5 overflow-y-auto">
          {HEAVY.map((name) => {
            const skip = excluded.has(name);
            return (
              <li key={name}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-accent [@media(pointer:coarse)]:py-2.5">
                  <input
                    type="checkbox"
                    className="size-4 shrink-0 accent-primary"
                    checked={skip}
                    onChange={() => toggle(name)}
                  />
                  <span className="font-mono text-[13px]">{name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {skip ? "excluded" : "included"}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm([...excluded])}>Download</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
