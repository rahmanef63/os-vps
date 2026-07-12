"use client";
/* ContextMenu — a tiny right-click menu shared by every shell (desktop
   background, taskbar/dock buttons). Open it from an onContextMenu handler via
   useContextMenu() (static items, e.g. a dock icon) or useShellContextMenu()
   (the desktop background — merges the shell's built-ins with registry items).
   It positions at the cursor, closes on outside-click / Esc / scroll, clamps to
   the viewport on all four edges, and is keyboard-drivable (focuses the first
   item on open, ArrowUp/Down cycles, Esc/Enter, focus restored to the trigger on
   close). Portaled to document.body so its z-index always wins — a non-portaled
   fixed layer is trapped inside a positioned/z-indexed ancestor (e.g. a taskbar)
   and can be occluded. */
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pos) return;
    const trigger = document.activeElement as HTMLElement | null; // restore focus here on close
    const btns = () => Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? []);
    btns()[0]?.focus(); // focus first item so Esc/arrows/Enter work without a click
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const list = btns();
      if (!list.length) return;
      const i = list.indexOf(document.activeElement as HTMLButtonElement);
      const next = e.key === "ArrowDown" ? (i + 1) % list.length : (i - 1 + list.length) % list.length;
      list[next]?.focus();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onClose, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onClose, true);
      trigger?.focus?.();
    };
  }, [pos, onClose]);

  if (!pos) return null;
  // Clamp on all four edges (Math.max lower-bounds so a click near the bottom/
  // right of a small viewport can't push the menu offscreen).
  const x = Math.max(8, Math.min(pos.x, window.innerWidth - 220));
  const y = Math.max(8, Math.min(pos.y, window.innerHeight - items.length * 34 - 12));

  return createPortal(
    <>
      {/* Above the dock (z-880) and menu bar (z-900): a right-click near the
          bottom must sit OVER the dock, and the backdrop must swallow clicks on
          the chrome (else a click launches an app while the menu is open). */}
      <div className="fixed inset-0 z-[1200]" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        ref={menuRef}
        role="menu"
        className="fixed z-[1201] min-w-[200px] rounded-lg border border-border bg-popover/95 p-1 text-sm shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
        style={{ left: x, top: y }}
      >
        {items.map((it, i) =>
          it.type === "sep" ? (
            <div key={i} role="separator" className="my-1 h-px bg-border" />
          ) : (
            <Button type="button" variant="ghost"
              key={i}
              role="menuitem"
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
    </>,
    document.body,
  );
}
