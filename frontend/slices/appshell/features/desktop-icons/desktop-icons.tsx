"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { openWindow } from "../../lib/store";
import { useApps } from "../../lib/registry";
import { AppIcon } from "../../components/app-icon";
import { ContextMenu, useContextMenu, type MenuItem } from "../../components/shells/context-menu";
import {
  ICON_H,
  ICON_W,
  getDesktopIcons,
  getSelected,
  moveIcons,
  removeIcons,
  setSelected,
  useDesktopIcons,
  useSelected,
  type DesktopIcon,
} from "./store";

// Icons layer — mounted INSIDE the window <section> (behind windows). The
// container is pointer-events-none so the bare desktop keeps its marquee + right-
// click; each icon opts back in and stops propagation so a drag/right-click on an
// icon doesn't also start the desktop marquee / open the desktop menu.
export function DesktopIcons() {
  const icons = useDesktopIcons();
  const selected = useSelected();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && getSelected().size) {
        const t = e.target as HTMLElement | null;
        if (t && /^(INPUT|TEXTAREA)$/.test(t.tagName)) return;
        e.preventDefault();
        removeIcons([...getSelected()]);
        setSelected([]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="pointer-events-none absolute inset-0 z-[4]">
      {icons.map((icon) => (
        <IconButton key={icon.id} icon={icon} selected={selected.has(icon.id)} />
      ))}
    </div>
  );
}

function IconButton({ icon, selected }: { icon: DesktopIcon; selected: boolean }) {
  const apps = useApps();
  const menu = useContextMenu();
  const app = apps.find((a) => a.id === icon.app);
  const drag = useRef<{ x: number; y: number } | null>(null);
  if (!app) return null;
  const open = () => openWindow(app.id, app.title, app.defaultSize);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (!getSelected().has(icon.id)) setSelected([icon.id]);
    drag.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    drag.current = { x: e.clientX, y: e.clientY };
    const ids = getSelected().has(icon.id) ? [...getSelected()] : [icon.id];
    moveIcons({ dx, dy }, ids);
  };
  const onPointerUp = () => { drag.current = null; };

  const items: MenuItem[] = [
    { label: `Open ${app.title}`, icon: ExternalLink, onClick: open },
    { type: "sep" },
    { label: "Remove", icon: Trash2, onClick: () => removeIcons([icon.id]) },
  ];

  return (
    <>
      <button
        type="button"
        style={{ left: icon.x, top: icon.y, width: ICON_W }}
        className={cn(
          "pointer-events-auto absolute flex touch-none flex-col items-center gap-1 rounded-lg p-1.5 text-center",
          selected ? "bg-primary/25 ring-1 ring-primary/60" : "hover:bg-white/10",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={open}
        onContextMenu={(e) => {
          e.stopPropagation();
          if (!getSelected().has(icon.id)) setSelected([icon.id]);
          menu.open(e);
        }}
      >
        <span className="size-11 drop-shadow"><AppIcon app={app} /></span>
        <span className="line-clamp-2 w-full text-[11px] font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
          {app.title}
        </span>
      </button>
      <ContextMenu pos={menu.pos} items={items} onClose={menu.close} />
    </>
  );
}

// Rubber-band selection for the desktop section. `onPointerDown` goes on the
// section (fires only on the bare surface, left button); it draws a rect (in
// section-relative coords) and live-selects the icons it intersects. Returns the
// rect for the caller to render as an overlay.
export function useDesktopMarquee() {
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const origin = useRef<{ cx: number; cy: number; ox: number; oy: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || e.target !== e.currentTarget) return;
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    origin.current = { cx: e.clientX, cy: e.clientY, ox: box.left, oy: box.top };
    setSelected([]);
    const move = (ev: PointerEvent) => {
      const o = origin.current;
      if (!o) return;
      const x0 = Math.min(o.cx, ev.clientX) - o.ox;
      const y0 = Math.min(o.cy, ev.clientY) - o.oy;
      const x1 = Math.max(o.cx, ev.clientX) - o.ox;
      const y1 = Math.max(o.cy, ev.clientY) - o.oy;
      setRect({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
      setSelected(
        getDesktopIcons()
          .filter((i) => i.x < x1 && i.x + ICON_W > x0 && i.y < y1 && i.y + ICON_H > y0)
          .map((i) => i.id),
      );
    };
    const up = () => {
      origin.current = null;
      setRect(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return { onPointerDown, rect };
}
