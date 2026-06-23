"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  closeQuickLook,
  inEditable,
  previewerFor,
  toggleQuickLook,
  useQuickLook,
} from "@/features/appshell";

// Space toggles the preview for the published target (never while typing);
// Escape closes. Centered glass panel — previewer renders the body.
export function QuickLookOverlay() {
  const { open, target } = useQuickLook();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " && !inEditable() && target != null) {
        e.preventDefault();
        toggleQuickLook();
      } else if (e.key === "Escape") {
        closeQuickLook();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target]);

  if (!open || target == null) return null;
  const previewer = previewerFor(target);
  const Body = previewer?.render;

  return (
    <div
      className="absolute inset-0 z-[8000] flex items-center justify-center bg-black/30"
      onClick={closeQuickLook}
    >
      <div
        className="glass relative flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex h-9 shrink-0 items-center border-b border-border px-3">
          <span className="text-xs font-semibold text-muted-foreground">Quick Look</span>
          <Button
            type="button"
            variant="ghost"
            aria-label="Close"
            onClick={closeQuickLook}
            className="ml-auto h-auto rounded p-1 font-normal hover:bg-muted"
          >
            <X className="size-3.5" />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto bg-background/80 [container-type:inline-size]">
          {Body ? <Body target={target} /> : <FallbackPreview target={target} />}
        </div>
      </div>
    </div>
  );
}

// No previewer claimed it — readable dump beats a dead overlay.
function FallbackPreview({ target }: { target: unknown }) {
  return (
    <pre className="overflow-auto p-4 text-xs text-muted-foreground">
      {typeof target === "string" ? target : JSON.stringify(target, null, 2)}
    </pre>
  );
}
