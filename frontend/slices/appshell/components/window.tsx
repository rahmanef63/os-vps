"use client";

import { Button } from "@/components/ui/button";
import { memo, useRef } from "react";
import { cn } from "@/lib/utils";
import { useWindow, useFocused } from "../hooks/use-shell";
import { useWindowDrag } from "../hooks/use-window-drag";
import {
  closeWindow,
  minimizeWindow,
  toggleMaximize,
  focusWindow,
  snapRect,
} from "../lib/store";
import { deliverDrop, dragCarriesPayload, readDragData } from "../lib/dnd";
import { spaceOf, useActiveSpace } from "../lib/spaces";
import { useGroupTop } from "../lib/window-tabs";
import { TrafficLights } from "./traffic-lights";
import { TabStrip } from "./window-tabs";
import { WindowContent } from "./window-content";
import type { WinId } from "../lib/types";

// Subscribes to ONE window — a drag on another window never re-renders this.
// `variant` picks the title-bar chrome (macOS traffic-lights vs Windows caption
// buttons); the shell that renders the window layer passes it. Everything else
// (drag, 8-way resize, content, snap preview) is shared.
export const Window = memo(function Window({ id, variant = "macos" }: { id: WinId; variant?: "macos" | "windows" }) {
  const win = useWindow(id);
  const focused = useFocused() === id;
  const activeSpace = useActiveSpace();
  const groupTopId = useGroupTop(win?.groupId);
  const ref = useRef<HTMLDivElement>(null);
  const { startDrag, startResize, zone } = useWindowDrag(id, ref);

  if (!win || win.minimized) return null;
  if (spaceOf(win) !== activeSpace) return null; // lives on another Space
  if (win.groupId && groupTopId !== id) return null; // a tab behind the group's active frame
  const preview = zone ? snapRect(zone) : null;
  const isWin = variant === "windows";

  return (
    <>
      {preview && (
        // absolute (not fixed): the preview is a child of the desktop surface, so
        // it shares the same coordinate space as the snapped window — they align.
        <div
          className="absolute z-[5] rounded-xl border-2 border-primary bg-primary/20"
          style={{ left: preview.x, top: preview.y, width: preview.w, height: preview.h }}
        />
      )}
      <div
        ref={ref}
        className={cn(
          "absolute flex flex-col overflow-hidden border border-border bg-card shadow-[var(--shadow-win)]",
          isWin ? "rounded-md" : "rounded-[var(--radius-win)]",
          // pinned (always-on-top) windows beat even the focused regular window
          win.pinned ? (focused ? "z-[70]" : "z-[60]") : focused ? "z-50" : "z-10",
        )}
        style={{ left: win.x, top: win.y, width: win.w, height: win.h }}
        onMouseDown={() => focusWindow(id)}
      >
        {isWin ? (
          <div
            className="flex h-[34px] shrink-0 cursor-grab items-center border-b border-border bg-card active:cursor-grabbing"
            onPointerDown={startDrag}
            onDoubleClick={() => toggleMaximize(id)}
          >
            <div className="pointer-events-none flex-1 truncate pl-3 text-[12px] font-medium text-muted-foreground">
              {win.title}
            </div>
            <WinCaption
              maximized={win.maximized}
              onMinimize={() => minimizeWindow(id)}
              onMaximize={() => toggleMaximize(id)}
              onClose={() => closeWindow(id)}
            />
          </div>
        ) : (
          <div
            className="glass flex h-[38px] shrink-0 cursor-grab items-center gap-2 border-b border-border px-3 active:cursor-grabbing"
            style={{ background: "var(--window-head)" }}
            onPointerDown={startDrag}
            onDoubleClick={() => toggleMaximize(id)}
          >
            <TrafficLights
              onClose={() => closeWindow(id)}
              onMinimize={() => minimizeWindow(id)}
              onMaximize={() => toggleMaximize(id)}
            />
            <div className="pointer-events-none flex-1 truncate text-center text-[13px] font-semibold text-muted-foreground">
              {win.title}
            </div>
            <div className="min-w-[54px]" />
          </div>
        )}

        {win.groupId && <TabStrip groupId={win.groupId} activeId={id} />}

        <div
          className="relative min-h-0 flex-1 overflow-hidden bg-background [container-type:inline-size]"
          // Cross-app DnD: shell payloads route to the app's drop handler;
          // native drags (file uploads) pass through untouched.
          onDragOver={(e) => {
            if (dragCarriesPayload(e)) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }
          }}
          onDrop={(e) => {
            const data = readDragData(e);
            if (data && deliverDrop(win.app, data)) e.preventDefault();
          }}
        >
          <WindowContent app={win.app} payload={win.payload} winId={id} />
        </div>

        <Handle cls="left-0 top-0 h-full w-2 cursor-ew-resize" onDown={(e) => startResize(e, "l")} />
        <Handle cls="right-0 top-0 h-full w-2 cursor-ew-resize" onDown={(e) => startResize(e, "r")} />
        <Handle cls="bottom-0 left-0 h-2 w-full cursor-ns-resize" onDown={(e) => startResize(e, "b")} />
        <Handle cls="bottom-0 right-0 size-4 cursor-nwse-resize" onDown={(e) => startResize(e, "br")} />
      </div>
    </>
  );
});

// Windows 11 caption buttons (minimize / maximize-restore / close), right-aligned.
function WinCaption({
  maximized, onMinimize, onMaximize, onClose,
}: {
  maximized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex h-full items-stretch">
      <CapBtn onClick={onMinimize} label="Minimize">
        <rect x="1" y="5" width="8" height="1" />
      </CapBtn>
      <CapBtn onClick={onMaximize} label={maximized ? "Restore" : "Maximize"}>
        {maximized ? (
          <>
            <rect x="1" y="2.5" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1" />
            <rect x="3" y="1" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1" />
          </>
        ) : (
          <rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1" />
        )}
      </CapBtn>
      <CapBtn onClick={onClose} label="Close" danger>
        <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </CapBtn>
    </div>
  );
}

function CapBtn({
  onClick, label, danger, children,
}: {
  onClick: () => void;
  label: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button type="button" variant="ghost"
      aria-label={label}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn("h-auto p-0 font-normal hover:bg-transparent", 
        "grid w-[46px] place-items-center text-muted-foreground transition-colors",
        danger ? "hover:bg-destructive hover:text-white" : "hover:bg-muted",
      )}
    >
      <svg viewBox="0 0 10 10" className="size-2.5" fill="currentColor">{children}</svg>
    </Button>
  );
}

function Handle({
  cls,
  onDown,
}: {
  cls: string;
  onDown: (e: React.PointerEvent) => void;
}) {
  return <div className={cn("absolute z-[5]", cls)} onPointerDown={onDown} />;
}
