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
import { cn } from "@/lib/utils";
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
      // Build items BEFORE preventDefault: if the merged menu is empty, leave the
      // browser's native menu intact rather than suppressing it AND showing nothing.
      const dynamic = getContextMenuItems({ shell, surface, x: e.clientX, y: e.clientY });
      const items = joinGroups([base, dynamic]);
      if (!items.length) return;
      e.preventDefault();
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
  // Match shell.rahmanef.com: LEFT-aligned rows, icon on the LEFT, accent-fill
  // hover. Per-persona metrics/motion read fresh at open time from the active
  // shell (stamped on #main-content's data-shell): macOS = dense + zoom-in;
  // Windows = Fluent (34px rows, fixed icon gutter, slide-down); iOS/Android =
  // 44pt touch targets + larger text (HIG). The accent is os-vps's own --primary
  // token — not a hardcoded hex — per the design.md "semantic tokens" guidance.
  const shell = document.querySelector("[data-shell]")?.getAttribute("data-shell");
  const isWin = shell === "windows";
  const isTouch = shell === "ios" || shell === "android";
  const itemMetrics = isWin
    ? "h-[34px] rounded-[4px]"
    : isTouch
      ? "min-h-11 rounded-lg py-2.5 text-[15px]"
      : "rounded-md py-1";
  const openMotion = isWin ? "fade-in-0 slide-in-from-top-2 duration-150" : "fade-in zoom-in-95 duration-100";
  const panelRadius = isWin ? "rounded-lg" : isTouch ? "rounded-2xl" : "rounded-xl";
  const iconSize = isTouch ? "size-[18px]" : "size-4";
  // Clamp on all four edges (Math.max lower-bounds so a click near the bottom/
  // right of a small viewport can't push the menu offscreen). Per-row height is
  // variant-aware so the bottom clamp reserves enough for the taller touch rows.
  // Read the POINTER, not just the shell persona: the a11y rule
  // (@media pointer:coarse → [role=menuitem]{min-height:44px} in globals.css)
  // forces 44px rows on a coarse pointer even under a desktop shell, so a
  // persona-only rowH under-reserves height and the menu overflows/clips.
  const coarse = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
  const rowH = isTouch || coarse ? 44 : isWin ? 34 : 30;
  const x = Math.max(8, Math.min(pos.x, window.innerWidth - 220));
  const y = Math.max(8, Math.min(pos.y, window.innerHeight - items.length * rowH - 12));

  return createPortal(
    <>
      {/* Above the dock (z-880) and menu bar (z-900): a right-click near the
          bottom must sit OVER the dock, and the backdrop must swallow clicks on
          the chrome (else a click launches an app while the menu is open). */}
      <div className="fixed inset-0 z-[1200]" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        ref={menuRef}
        role="menu"
        className={cn(
          // max-height + scroll: belt-and-suspenders so the menu can NEVER run off
          // the viewport regardless of row-height drift (it scrolls instead of clipping).
          "fixed z-[1201] max-h-[calc(100dvh-16px)] min-w-[200px] overflow-y-auto border border-border bg-popover/95 p-1 text-sm shadow-2xl backdrop-blur-md animate-in",
          panelRadius,
          openMotion,
        )}
        style={{ left: x, top: y }}
      >
        {items.map((it, i) =>
          it.type === "sep" ? (
            <div key={i} role="separator" className="my-1 h-px bg-border" />
          ) : (
            <button
              type="button"
              key={i}
              role="menuitem"
              disabled={it.disabled}
              onClick={() => { it.onClick(); onClose(); }}
              className={cn(
                "group flex w-full items-center gap-2.5 px-2.5 text-left outline-none transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:bg-primary focus-visible:text-primary-foreground disabled:opacity-40 disabled:hover:bg-transparent",
                it.danger ? "text-destructive-text" : "text-foreground/90",
                itemMetrics,
              )}
            >
              {isWin ? (
                // Fixed icon gutter — an empty same-size slot keeps every label's
                // left edge aligned even when a row has no icon (Fluent rows).
                <span className="flex size-4 shrink-0 items-center justify-center">
                  {it.icon && <it.icon className="size-4 text-primary group-hover:text-primary-foreground group-focus-visible:text-primary-foreground" />}
                </span>
              ) : (
                it.icon && <it.icon className={cn(iconSize, "shrink-0 text-primary group-hover:text-primary-foreground group-focus-visible:text-primary-foreground")} />
              )}
              <span className="min-w-0 flex-1 truncate">{it.label}</span>
              {/* macOS-style right-aligned keyboard hint (display only). */}
              {it.shortcut && (
                <span className="shrink-0 pl-4 text-xs tabular-nums opacity-50 group-hover:opacity-80">{it.shortcut}</span>
              )}
            </button>
          ),
        )}
      </div>
    </>,
    document.body,
  );
}
