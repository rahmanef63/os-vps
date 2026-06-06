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
  type ResponsiveDialogVariant,
  type ResponsiveDialogSize,
  type ResponsiveDialogMobileVariant,
  type ResponsiveDialogSide,
} from "./responsive-dialog-context";
import {
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from "./responsive-dialog-parts";

export type {
  ResponsiveDialogVariant,
  ResponsiveDialogSize,
  ResponsiveDialogMobileVariant,
  ResponsiveDialogSide,
} from "./responsive-dialog-context";

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

export interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: ResponsiveDialogVariant;
  size?: ResponsiveDialogSize;
  mobileVariant?: ResponsiveDialogMobileVariant;
  sheetSide?: ResponsiveDialogSide;
  showCloseButton?: boolean;
  dismissible?: boolean;
  contentClassName?: string;
  children: React.ReactNode;
}

function ResponsiveDialogRoot({
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

type ResponsiveDialogComponent = typeof ResponsiveDialogRoot & {
  Header: typeof ResponsiveDialogHeader;
  Title: typeof ResponsiveDialogTitle;
  Description: typeof ResponsiveDialogDescription;
  Body: typeof ResponsiveDialogBody;
  Footer: typeof ResponsiveDialogFooter;
};

export const ResponsiveDialog = ResponsiveDialogRoot as ResponsiveDialogComponent;
ResponsiveDialog.Header = ResponsiveDialogHeader;
ResponsiveDialog.Title = ResponsiveDialogTitle;
ResponsiveDialog.Description = ResponsiveDialogDescription;
ResponsiveDialog.Body = ResponsiveDialogBody;
ResponsiveDialog.Footer = ResponsiveDialogFooter;

export {
  ResponsiveDialogRoot,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
};
