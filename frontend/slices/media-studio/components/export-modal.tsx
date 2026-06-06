"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { FormDrawer } from "@/features/os-shell";

export type ExportTab = "json" | "html";

// Tabbed JSON/HTML preview with copy, download, and an Import button. Uses the
// shared FormDrawer: dialog on desktop, bottom drawer on mobile.
export function ExportModal({
  open,
  tab,
  text,
  onOpenChange,
  onTab,
  onDownload,
  onCopy,
  onImport,
}: {
  open: boolean;
  tab: ExportTab;
  text: string;
  onOpenChange: (open: boolean) => void;
  onTab: (t: ExportTab) => void;
  onDownload: () => void;
  onCopy: () => void;
  onImport: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <FormDrawer open={open} onOpenChange={onOpenChange} size="lg">
      <FormDrawer.Header>
        <div className="flex flex-wrap items-center gap-2">
          <FormDrawer.Title>Export / Import</FormDrawer.Title>
          <Segmented
            options={[
              { value: "json", label: "JSON" },
              { value: "html", label: "HTML" },
            ]}
            value={tab}
            onChange={onTab}
            className="ml-1"
          />
          <Button
            variant="secondary"
            size="sm"
            className="ml-auto"
            onClick={() => fileRef.current?.click()}
          >
            Import file…
          </Button>
        </div>
      </FormDrawer.Header>

      <FormDrawer.Body className="px-0 py-0">
        <pre className="m-0 h-full overflow-auto bg-muted px-4 py-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words text-foreground">
          {text}
        </pre>
      </FormDrawer.Body>

      <FormDrawer.Footer>
        <span className="flex-1 text-[11px] text-muted-foreground">
          Auto z-index from layer order · per-layer CSS included.
        </span>
        <Button variant="secondary" size="sm" onClick={onCopy}>
          Copy
        </Button>
        <Button size="sm" onClick={onDownload}>
          Download .{tab}
        </Button>
      </FormDrawer.Footer>

      <input
        ref={fileRef}
        type="file"
        accept=".json,.html,.htm,.svg,.txt"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImport(f);
          e.target.value = "";
        }}
      />
    </FormDrawer>
  );
}
