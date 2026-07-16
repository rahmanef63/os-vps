"use client";

import { useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormDrawer } from "./host-drawer";

const FOLDERS = ["/", "/Documents", "/Projects", "/apps"];

// Create-file form. Uses the shared FormDrawer: centered dialog on desktop,
// bottom drawer on mobile.
export function NewFileModal({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (dir: string, name: string) => void;
}) {
  const [name, setName] = useState("untitled.ts");
  const [dir, setDir] = useState("/Projects");

  const submit = () => {
    if (name.trim()) {
      onCreate(dir, name);
      onOpenChange(false);
    }
  };

  const onKey = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Enter") submit();
  };

  return (
    <FormDrawer open={open} onOpenChange={onOpenChange} size="sm">
      <FormDrawer.Header>
        <FormDrawer.Title>New file</FormDrawer.Title>
        <FormDrawer.Description>Pick a folder and a file name.</FormDrawer.Description>
      </FormDrawer.Header>
      <FormDrawer.Body className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Folder
          </label>
          <select
            value={dir}
            onChange={(e) => setDir(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
          >
            {FOLDERS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            File name
          </label>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onKey} />
        </div>
      </FormDrawer.Body>
      <FormDrawer.Footer>
        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="[@media(pointer:coarse)]:min-h-[44px]">
          Cancel
        </Button>
        <Button size="sm" onClick={submit} className="[@media(pointer:coarse)]:min-h-[44px]">
          Create
        </Button>
      </FormDrawer.Footer>
    </FormDrawer>
  );
}
