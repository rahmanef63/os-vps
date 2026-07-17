"use client";

import * as React from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { useIsMobile } from "../responsive/use-is-mobile";
import { cn } from "@/lib/utils";
import {
  ResponsiveDialogContext,
  type ResponsiveDialogContextValue,
  type ResponsiveDialogSize,
} from "./responsive-dialog-context";
import type { ResponsiveDialogProps } from "./responsive-dialog";

// The HEAVY chunk (radix Dialog/AlertDialog/Sheet + vaul Drawer). Loaded via
// next/dynamic from responsive-dialog.tsx only when a dialog first OPENS, so
// desktop first paint ships none of it. Re-exports the header/title/body/footer
// parts through this SAME chunk so a dialog's shell + chrome arrive in one fetch.
export {
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from "./responsive-dialog-parts";

const SIZE_DESKTOP_WIDTH: Record<ResponsiveDialogSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
  full: "sm:max-w-[95vw]",
};

const SIZE_DESKTOP_HEIGHT: Record<ResponsiveDialogSize, string> = {
  sm: "max-h-[60vh]",
  md: "max-h-[70vh]",
  lg: "max-h-[80vh]",
  xl: "h-[80vh]",
  full: "h-[90vh]",
};

export function ResponsiveDialogShell({
  open,
  onOpenChange,
  variant = "modal",
  size = "md",
  mobileVariant = "drawer-bottom",
  sheetSide = "right",
  showCloseButton = true,
  dismissible = true,
  contentClassName,
  children,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  const contextValue = React.useMemo<ResponsiveDialogContextValue>(
    () => ({ variant, size, isMobile }),
    [variant, size, isMobile],
  );

  if (isMobile) {
    const direction: "bottom" | "right" = mobileVariant === "drawer-right" ? "right" : "bottom";
    const mobileHeight = direction === "bottom" ? "h-[90dvh] max-h-[90dvh]" : "h-full";
    return (
      <ResponsiveDialogContext.Provider value={contextValue}>
        <Drawer open={open} onOpenChange={onOpenChange} direction={direction} dismissible={dismissible}>
          <DrawerContent
            className={cn(
              "flex flex-col gap-0 p-0",
              direction === "bottom"
                ? "rounded-t-[1.25rem] border-x-0 border-b-0"
                : "w-full max-w-[95vw] sm:max-w-md",
              mobileHeight,
              contentClassName,
            )}
          >
            {children}
          </DrawerContent>
        </Drawer>
      </ResponsiveDialogContext.Provider>
    );
  }

  if (variant === "alert") {
    return (
      <ResponsiveDialogContext.Provider value={contextValue}>
        <AlertDialog open={open} onOpenChange={onOpenChange}>
          <AlertDialogContent
            className={cn("flex flex-col gap-0 overflow-hidden p-0", SIZE_DESKTOP_WIDTH[size], contentClassName)}
          >
            {children}
          </AlertDialogContent>
        </AlertDialog>
      </ResponsiveDialogContext.Provider>
    );
  }

  if (variant === "panel") {
    return (
      <ResponsiveDialogContext.Provider value={contextValue}>
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent
            side={sheetSide}
            className={cn(
              "flex h-full w-full max-w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg",
              contentClassName,
            )}
          >
            {children}
          </SheetContent>
        </Sheet>
      </ResponsiveDialogContext.Provider>
    );
  }

  return (
    <ResponsiveDialogContext.Provider value={contextValue}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={showCloseButton}
          className={cn(
            "flex flex-col gap-0 overflow-hidden p-0",
            SIZE_DESKTOP_WIDTH[size],
            SIZE_DESKTOP_HEIGHT[size],
            contentClassName,
          )}
        >
          {children}
        </DialogContent>
      </Dialog>
    </ResponsiveDialogContext.Provider>
  );
}
