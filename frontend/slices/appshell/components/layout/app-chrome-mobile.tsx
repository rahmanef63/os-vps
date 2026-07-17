"use client";

// The mobile Sheet/Drawer branches of app-chrome's SideRegion (radix Sheet +
// vaul Drawer). Lifted into its own async chunk so desktop never ships either
// package at first paint — loaded via next/dynamic from app-chrome.tsx only when
// a phone renders a sidebar/inspector. JSX moved verbatim (no visual change).

import { type ReactNode } from "react";
import { Drawer as Vaul } from "vaul";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function MobileSideRegion({
  open,
  onOpenChange,
  side,
  title,
  description,
  sheetWidth,
  sheetClassName,
  mobileVariant = "sheet",
  mobileHeight = "h-[50dvh]",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side: "left" | "right";
  title: string;
  description?: string;
  sheetWidth: string;
  sheetClassName?: string;
  mobileVariant?: "sheet" | "drawer";
  mobileHeight?: string;
  children: ReactNode;
}) {
  if (mobileVariant === "drawer") {
    // Non-modal, overlay-less bottom drawer → the live edit preview above stays
    // visible and usable while the panel is open.
    return (
      <Vaul.Root open={open} onOpenChange={onOpenChange} direction="bottom" modal={false}>
        <Vaul.Portal>
          <Vaul.Content
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl border-t border-border bg-card shadow-2xl outline-none",
              mobileHeight,
              sheetClassName,
            )}
          >
            <Vaul.Title className="sr-only">{title}</Vaul.Title>
            <Vaul.Description className="sr-only">{description ?? title}</Vaul.Description>
            <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted" />
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
          </Vaul.Content>
        </Vaul.Portal>
      </Vaul.Root>
    );
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className={cn(sheetWidth, "p-0", sheetClassName)}>
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <SheetDescription className="sr-only">{description ?? title}</SheetDescription>
        <div className="flex h-full w-full min-h-0 flex-col overflow-y-auto">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
