"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Windows 11 caption buttons (minimize / maximize-restore / close), right-aligned.
export function WinCaption({
  maximized, onMinimize, onMaximize, onClose,
}: {
  maximized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex h-full items-stretch">
      <CapBtn onClick={onMinimize} label="Minimize window">
        <rect x="1" y="5" width="8" height="1" />
      </CapBtn>
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
