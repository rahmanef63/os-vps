"use client";
/* ContextMenuHost — ONE right-click listener for the whole OS surface, mounted
   once inside #main-content (desktop.tsx Surface). On contextmenu it walks the
   DOM zones under the cursor (collectZones), optionally appends the shell/global
   registry group, and if the merged menu is non-empty preventDefaults + opens
   the SHARED ContextMenu portal. Empty → the native menu is left intact.

   Why a React onContextMenu on a display:contents wrapper (not a native
   listener): a React synthetic handler fires in BUBBLE order, AFTER descendant
   handlers. So any not-yet-migrated menu (window title bar, dock, files, the 5
   shell backgrounds) that already `preventDefault`s the click is seen here as
   `e.defaultPrevented === true` and left alone. That gate is what makes adopting
   this host — and migrating the bespoke menus onto it — 100% incremental + safe. */
import { useCallback, useState, type ReactNode } from "react";
import { useActiveShell } from "../../registry/shells";
import { collectZones } from "../../lib/context-zone";
import { getContextMenuItems, joinGroups, type MenuItem } from "../../lib/context-menu";
import { ContextMenu } from "./context-menu";

type Menu = { x: number; y: number; items: MenuItem[] } | null;

export function ContextMenuHost({ children }: { children: ReactNode }) {
  const { id: shell, surface } = useActiveShell();
  const [menu, setMenu] = useState<Menu>(null);

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (e.defaultPrevented) return; // a descendant / legacy handler already claimed it
      const target = e.target as Element;
      const closest = (sel: string) => !!(target.closest && target.closest(sel));
      const base = { shell, surface, x: e.clientX, y: e.clientY };
      const { groups, sealed } = collectZones(target, base);

      // Plain editable fields keep the native copy/paste/spellcheck menu unless a
      // zone explicitly claimed them.
      if (!groups.length && closest("input,textarea,[contenteditable]")) return;

      // The shell/global registry (View as / Change wallpaper / New Files window)
      // applies only to the BARE shell background — never inside a window or an
      // open dashboard pane (those keep the legacy per-shell guards until they
      // migrate to root zones). Once the shells are zones this can drop the guard.
      const onChrome = !closest("[data-window],[data-dashboard-main]");
      const registry = sealed || !onChrome ? [] : getContextMenuItems(base);
      const items = joinGroups([...groups, registry]);
      if (!items.length) return; // graceful: leave the native menu

      e.preventDefault();
      setMenu({ x: e.clientX, y: e.clientY, items });
    },
    [shell, surface],
  );

  return (
    <div className="contents" onContextMenu={onContextMenu}>
      {children}
      <ContextMenu
        pos={menu ? { x: menu.x, y: menu.y } : null}
        items={menu?.items ?? []}
        onClose={() => setMenu(null)}
      />
    </div>
  );
}
