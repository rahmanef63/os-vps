"use client";
/* ContextMenu — a tiny right-click menu shared by every shell (desktop
   background, taskbar/dock buttons). Open it from an onContextMenu handler via
   useContextMenu() (static items, e.g. a dock icon) or useShellContextMenu()
   (the desktop background — merges the shell's built-ins with registry items).
   It positions at the cursor, closes on outside-click / Esc / scroll, and clamps
   to the viewport. No portal — a fixed layer above all chrome. */
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";
import { getContextMenuItems, joinGroups, type MenuItem } from "../../lib/context-menu";
import type { ShellId, ShellSurface } from "../../registry/shells";

export type { MenuItem };

type Pos = { x: number; y: number } | null;
type ClickLike = { preventDefault: () => void; clientX: number; clientY: number };

export function useContextMenu() {
  const [pos, setPos] = useState<Pos>(null);
  const open = useCallback((e: ClickLike) => {
    e.preventDefault();
    setPos({ x: e.clientX, y: e.clientY });
  }, []);
  const close = useCallback(() => setPos(null), []);
  return { pos, open, close };
}

// Desktop-background menu: merges the shell's own built-in items (passed at open
// time, so they read current state) with everything registered for this shell.
export function useShellContextMenu(shell: ShellId, surface: ShellSurface = "desktop") {
  const [state, setState] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const open = useCallback(
    (e: ClickLike, base: MenuItem[] = []) => {
      e.preventDefault();
      const dynamic = getContextMenuItems({ shell, surface, x: e.clientX, y: e.clientY });
      const items = joinGroups([base, dynamic]);
      if (!items.length) return;
      setState({ x: e.clientX, y: e.clientY, items });
    },
    [shell, surface],
  );
  const close = useCallback(() => setState(null), []);
  return { state, open, close };
}

// Renders the merged menu from useShellContextMenu state.
export function ShellContextMenu({
  state,
  onClose,
}: {
  state: { x: number; y: number; items: MenuItem[] } | null;
  onClose: () => void;
}) {
  return <ContextMenu pos={state ? { x: state.x, y: state.y } : null} items={state?.items ?? []} onClose={onClose} />;
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
