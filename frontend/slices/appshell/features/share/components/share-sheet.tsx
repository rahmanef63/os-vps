"use client";

import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { closeShare, targetsFor, useShareState, type ShareTarget } from "@/features/appshell";

// Share sheet — bottom-center card (iOS-flavored, works on every shell).
// The panel MOUNTS per open (and unmounts on close), so selection state starts
// fresh every time without an effect-driven reset (react-hooks v6).
export function ShareSheet() {
  const { open, payload } = useShareState();
  return open ? <ShareSheetPanel payload={payload} /> : null;
}

function ShareSheetPanel({ payload }: { payload: unknown }) {
  const [sel, setSel] = useState(0);
  const list = targetsFor(payload);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeShare();
      else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSel((s) => (s + 1) % Math.max(1, list.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSel((s) => (s - 1 + list.length) % Math.max(1, list.length));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const t = list[sel];
        if (t) runTarget(t, payload);
      }
    };
    // Defer the attach one frame: the keydown that OPENED the sheet (palette
    // Enter) is still bubbling and must not immediately run the first target.
    let attached = false;
    const raf = requestAnimationFrame(() => {
      attached = true;
      window.addEventListener("keydown", onKey);
    });
    return () => {
      cancelAnimationFrame(raf);
      if (attached) window.removeEventListener("keydown", onKey);
    };
  }, [list, sel, payload]);

  return (
    <div className="absolute inset-0 z-[8600] flex items-end justify-center bg-black/25 pb-[12vh]" onClick={closeShare}>
      <div className="glass w-full max-w-sm overflow-hidden rounded-2xl border border-border shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <Share2 className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground">Share</span>
        </header>
        <ul className="p-2">
          {list.map((t, i) => (
            <li key={t.id}>
              <Button
                type="button"
                variant="ghost"
                onMouseMove={() => setSel(i)}
                onClick={() => runTarget(t, payload)}
                className={cn(
                  "h-auto w-full justify-start rounded-lg px-3 py-2 text-sm font-normal hover:bg-transparent",
                  i === sel ? "bg-primary/15" : "",
                )}
              >
                {t.label}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function runTarget(t: ShareTarget, payload: unknown) {
  closeShare();
  void t.run(payload);
}
