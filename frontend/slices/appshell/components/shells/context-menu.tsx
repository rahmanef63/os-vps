"use client";
/* ContextMenu — a tiny right-click menu shared by the desktop shells (macOS +
   Windows desktop background, Windows taskbar buttons). Open it from an
   onContextMenu handler via useContextMenu(); it positions at the cursor, closes
   on outside-click / Esc / scroll, and clamps to the viewport. No portal — it
   renders a fixed-position layer at z-[200] above all chrome. */
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";

export type MenuItem =
  | { type?: "item"; label: string; icon?: LucideIcon; onClick: () => void; disabled?: boolean }
  | { type: "sep" };

type Pos = { x: number; y: number } | null;

export function useContextMenu() {
  const [pos, setPos] = useState<Pos>(null);
  const open = useCallback((e: { preventDefault: () => void; clientX: number; clientY: number }) => {
    e.preventDefault();
    setPos({ x: e.clientX, y: e.clientY });
  }, []);
  const close = useCallback(() => setPos(null), []);
  return { pos, open, close };
}

export function ContextMenu({ pos, items, onClose }: { pos: Pos; items: MenuItem[]; onClose: () => void }) {
  useEffect(() => {
    if (!pos) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onClose, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [pos, onClose]);

  if (!pos) return null;
  // Clamp so the menu never spills off the right/bottom edge.
  const x = Math.min(pos.x, window.innerWidth - 220);
  const y = Math.min(pos.y, window.innerHeight - items.length * 34 - 12);

  return (
    <>
      {/* Above the dock (z-880) and menu bar (z-900): a right-click near the
          bottom must sit OVER the dock, and the backdrop must swallow clicks on
          the chrome (else a click launches an app while the menu is open). */}
      <div className="fixed inset-0 z-[1200]" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        className="fixed z-[1201] min-w-[200px] rounded-lg border border-border bg-popover/95 p-1 text-sm shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
        style={{ left: x, top: y }}
      >
        {items.map((it, i) =>
          it.type === "sep" ? (
            <div key={i} className="my-1 h-px bg-border" />
          ) : (
            <Button type="button" variant="ghost"
              key={i}
              disabled={it.disabled}
              onClick={() => { it.onClick(); onClose(); }}
              className="h-auto p-0 font-normal hover:bg-transparent flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-foreground/90 transition-colors hover:bg-muted disabled:opacity-40"
            >
              {it.icon && <it.icon className="size-4 shrink-0 text-muted-foreground" />}
              <span className="truncate">{it.label}</span>
            </Button>
          ),
        )}
      </div>
    </>
  );
}
