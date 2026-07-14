"use client";

import { createElement, useEffect, useRef, useState } from "react";
import { ArrowRightLeft, Check, LayoutGrid, Trash2 } from "lucide-react";
import { ContextMenu, registerCommands, registerContextMenu, toast, useContextMenu, type MenuItem } from "@/features/appshell";
import { cn } from "@/lib/utils";
import {
  getWidgetState,
  setCurrentSpace,
  setPickerOpen,
  setWidgetPos,
  setWidgetSize,
  setWidgetSpace,
  setWidgetsOn,
  toggleWidget,
  useCurrentSpace,
  useWidgetState,
  type WidgetPos,
  type WidgetSize,
} from "../widget-registry";
import { WIDGET_RENDER } from "./widgets-defs";
import { WidgetPicker } from "./widget-picker";

// Desktop widgets — a glanceable, EDITABLE set free-positioned on the wallpaper
// layer (behind windows), across two Spaces. Drag a widget to move it; right-
// click sets its size / space / removes it; the space pager switches desktops.
// Layout + set live in the widget-registry store; the WidgetPicker edits membership.

registerCommands("desktop-widgets", [
  {
    id: "widgets:desktop",
    label: "Toggle desktop widgets",
    hint: "Widgets",
    keywords: "glance dashboard wallpaper stats",
    run: () => {
      const next = !getWidgetState().on;
      setWidgetsOn(next);
      toast(next ? "Desktop widgets on" : "Desktop widgets off");
    },
  },
  {
    id: "widgets:configure",
    label: "Configure desktop widgets",
    hint: "Widgets",
    keywords: "desktop widget picker add remove reorder",
    run: () => setPickerOpen(true),
  },
]);

registerContextMenu("macos", () => [
  { label: "Desktop widgets…", icon: LayoutGrid, onClick: () => setPickerOpen(true) },
]);

const SIZE_W: Record<WidgetSize, string> = { s: "w-44", m: "w-60", l: "w-72" };
const SIZE_PX: Record<WidgetSize, number> = { s: 176, m: 240, l: 288 };

// One free-dragged widget. Drag from any non-interactive part (its own inputs /
// buttons keep working); the move commits once on drop (not every frame). Right-
// click sets size, moves it to the other Space, or removes it.
function DesktopWidget({ id, size, pos, space }: { id: string; size: WidgetSize; pos: WidgetPos; space: number }) {
  const ctx = useContextMenu();
  const Render = WIDGET_RENDER[id];
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [offset, setOffset] = useState<{ dx: number; dy: number } | null>(null);
  if (!Render) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("input,textarea,button,a,[contenteditable],iframe,summary")) return;
    e.stopPropagation();
    drag.current = { x: e.clientX, y: e.clientY };
    setOffset({ dx: 0, dy: 0 });
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setOffset({ dx: e.clientX - drag.current.x, dy: e.clientY - drag.current.y });
  };
  const onPointerUp = () => {
    if (drag.current && offset) setWidgetPos(id, pos.x + offset.dx, pos.y + offset.dy);
    drag.current = null;
    setOffset(null);
  };

  const other = space === 0 ? 1 : 0;
  const items: MenuItem[] = [
    { label: "Small", icon: size === "s" ? Check : undefined, onClick: () => setWidgetSize(id, "s") },
    { label: "Medium", icon: size === "m" ? Check : undefined, onClick: () => setWidgetSize(id, "m") },
    { label: "Large", icon: size === "l" ? Check : undefined, onClick: () => setWidgetSize(id, "l") },
    { type: "sep" },
    { label: `Move to Space ${other + 1}`, icon: ArrowRightLeft, onClick: () => setWidgetSpace(id, other) },
    { label: "Remove widget", icon: Trash2, onClick: () => toggleWidget(id) },
    { label: "Desktop widgets…", icon: LayoutGrid, onClick: () => setPickerOpen(true) },
  ];

  return (
    <div
      className={cn("pointer-events-auto absolute touch-none cursor-grab active:cursor-grabbing", SIZE_W[size])}
      style={{ left: pos.x + (offset?.dx ?? 0), top: pos.y + (offset?.dy ?? 0) }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onContextMenu={(e) => { e.stopPropagation(); ctx.open(e); }}
    >
      {createElement(Render)}
      <ContextMenu pos={ctx.pos} items={items} onClose={ctx.close} />
    </div>
  );
}

export function DesktopWidgets() {
  const { on, enabled, sizes, positions, spaces } = useWidgetState();
  const space = useCurrentSpace();
  const ref = useRef<HTMLDivElement>(null);
  const visible = enabled.filter((id) => (spaces[id] ?? 0) === space);

  // Auto-place any visible widget that lacks a saved position — a top-right
  // column, matching the previous stack so the migration is seamless.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const W = el.clientWidth;
    let slot = 0;
    for (const id of visible) {
      if (positions[id]) continue;
      setWidgetPos(id, Math.max(0, W - SIZE_PX[sizes[id] ?? "m"] - 16), 16 + slot * 128);
      slot++;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible.join(","), space, on]);

  if (!on) return <WidgetPicker />;
  return (
    <>
      <WidgetPicker />
      <div ref={ref} className="pointer-events-none absolute inset-0 z-[5]">
        {visible.map((id) => {
          const pos = positions[id];
          return pos ? <DesktopWidget key={id} id={id} size={sizes[id] ?? "m"} pos={pos} space={space} /> : null;
        })}
      </div>
      {/* Space pager — switch desktops; a new widget lands on the active one. */}
      <div className="pointer-events-auto absolute left-1/2 top-2 z-[6] flex -translate-x-1/2 gap-1.5 rounded-full bg-black/25 px-2 py-1 backdrop-blur">
        {[0, 1].map((s) => (
          <button
            key={s}
            type="button"
            aria-label={`Space ${s + 1}`}
            onClick={() => setCurrentSpace(s)}
            className={cn("size-2 rounded-full transition-colors", space === s ? "bg-white" : "bg-white/40 hover:bg-white/70")}
          />
        ))}
      </div>
    </>
  );
}
