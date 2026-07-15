"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ControlCenterTiles } from "./control-center-tiles";

// Desktop Control Center — a menu-bar trailing glyph opening a popover of the SAME
// real toggles as the mobile CC. Mounted via the `menuBarStatus` slot, so it lives
// only in the macOS menu bar (the only surface that renders that region). No
// fabricated-hardware sliders — VPS essence, same as the mobile CC.
export function ControlCenterDesktop() {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="Control Center" className="size-7 rounded-md">
          <SlidersHorizontal className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="glass w-80 rounded-xl border-border bg-[var(--glass-menu)] p-3"
      >
        <ControlCenterTiles onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
