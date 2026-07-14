"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SnapLayoutsMenu } from "./snap-layouts";
import type { WinId } from "../lib/types";

// Windows 11 caption buttons (minimize / maximize-restore / close), right-aligned.
export function WinCaption({
  id, maximized, onMinimize, onMaximize, onClose,
}: {
  id: WinId;
  maximized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}) {
  const [snapOpen, setSnapOpen] = useState(false);
  return (
    <div className="flex h-full items-stretch">
      <CapBtn onClick={onMinimize} label="Minimize window">
        <rect x="1" y="5" width="8" height="1" />
      </CapBtn>
      {/* Win11 Snap Layouts: hovering maximize drops a layout picker. win-caption
          owns open/close; SnapLayoutsMenu calls the existing snapWindow store action. */}
      <div className="relative flex" onMouseEnter={() => setSnapOpen(true)} onMouseLeave={() => setSnapOpen(false)}>
        <CapBtn onClick={onMaximize} label={maximized ? "Restore window" : "Maximize window"}>
          {maximized ? (
            <>
              <rect x="1" y="2.5" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1" />
              <rect x="3" y="1" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1" />
            </>
          ) : (
            <rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1" />
          )}
        </CapBtn>
        {snapOpen && <SnapLayoutsMenu id={id} onClose={() => setSnapOpen(false)} />}
      </div>
      <CapBtn onClick={onClose} label="Close window" danger>
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
