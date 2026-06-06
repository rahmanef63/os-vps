"use client";

import * as React from "react";

export type ResponsiveDialogVariant = "modal" | "panel" | "alert";
export type ResponsiveDialogSize = "sm" | "md" | "lg" | "xl" | "full";
export type ResponsiveDialogMobileVariant = "drawer-bottom" | "drawer-right";
export type ResponsiveDialogSide = "left" | "right" | "top" | "bottom";

export interface ResponsiveDialogContextValue {
  variant: ResponsiveDialogVariant;
  size: ResponsiveDialogSize;
  isMobile: boolean;
}

export const ResponsiveDialogContext =
  React.createContext<ResponsiveDialogContextValue | null>(null);

export function useResponsiveDialogContext(
  componentName: string,
): ResponsiveDialogContextValue {
  const ctx = React.useContext(ResponsiveDialogContext);
  if (!ctx) {
    throw new Error(
      `<ResponsiveDialog.${componentName}> must be rendered inside <ResponsiveDialog>`,
    );
  }
  return ctx;
}
