"use client";

/**
 * app-chrome — internal layout blocks (AppHeader, AppSidebar, AppInspector)
 * composed by AppFrame.
 *
 * Consumers: use AppFrame (appshell/primitives/app-frame.tsx) at the app slice
 * level. AppFrame supplies the @container scaffolding + safe-area padding +
 * header/toolbar/footer slots; the chrome pieces here render the regions
 * (top toolbar, side sheets/rails) inside those slots.
 *
 * Don't import these pieces directly from app slices — go through AppFrame.
 */

import { type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useIsMobile } from "../../responsive/use-is-mobile";
import { cn } from "@/lib/utils";

// Mobile Sheet/Drawer chrome (radix Sheet + vaul Drawer) loads only on phones,
// in its own async chunk. Desktop renders the plain <aside> rail below and ships
// neither package at first paint.
const MobileSideRegion = dynamic(
  () => import("./app-chrome-mobile").then((m) => m.MobileSideRegion),
  { ssr: false, loading: () => null },
);

// Reusable app-window chrome so every app reads the same. All regions are
// OPTIONAL — an app composes only what it needs.
//   • Mobile (viewport < 768): Sidebar → left Sheet, Inspector → right Sheet.
//   • Desktop: inline rail, shown unless `railOpen={false}` (a desktop collapse
//     toggle). Forms / previews use <FormDrawer> (dialog ⇄ bottom drawer).
// Apps that toggle a panel on both form factors branch their handler with
// `useIsMobile()` from the shell's responsive module.

// Standard top toolbar bar.
export function AppHeader({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <header
      className={cn(
        "flex h-11 shrink-0 items-center gap-2 border-b border-border px-2",
        className,
      )}
    >
      {children}
    </header>
  );
}

function SideRegion({
  open,
  onOpenChange,
  side,
  railOpen,
  title,
  description,
  railBase,
  railClassName,
  sheetWidth,
  sheetClassName,
  mobileVariant = "sheet",
  mobileHeight = "h-[50dvh]",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side: "left" | "right";
  railOpen: boolean;
  title: string;
  description?: string;
  railBase: string;
  railClassName?: string;
  sheetWidth: string;
  sheetClassName?: string;
  /** Mobile presentation: side Sheet (default) or a non-modal bottom drawer
   *  that leaves the canvas/preview visible + interactive above it. */
  mobileVariant?: "sheet" | "drawer";
  mobileHeight?: string;
  children: ReactNode;
}) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <MobileSideRegion
        open={open}
        onOpenChange={onOpenChange}
        side={side}
        title={title}
        description={description}
        sheetWidth={sheetWidth}
        sheetClassName={sheetClassName}
        mobileVariant={mobileVariant}
        mobileHeight={mobileHeight}
      >
        {children}
      </MobileSideRegion>
    );
  }
  if (!railOpen) return null;
  return <aside className={cn(railBase, railClassName)}>{children}</aside>;
}

// Left navigation. Inline rail on desktop (hide via railOpen); left Sheet on
// mobile. Keep `children` layout-agnostic — they render in either slot.
export function AppSidebar({
  open,
  onOpenChange,
  railOpen = true,
  title = "Sidebar",
  description,
  railClassName,
  sheetClassName,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  railOpen?: boolean;
  title?: string;
  description?: string;
  railClassName?: string;
  sheetClassName?: string;
  children: ReactNode;
}) {
  return (
    <SideRegion
      open={open}
      onOpenChange={onOpenChange}
      side="left"
      railOpen={railOpen}
      title={title}
      description={description}
      railBase="flex w-56 shrink-0 flex-col border-r border-border bg-sidebar"
      railClassName={railClassName}
      sheetWidth="w-72 sm:max-w-xs"
      sheetClassName={sheetClassName}
    >
      {children}
    </SideRegion>
  );
}

// Right property/inspector. Inline rail on desktop (hide via railOpen); right
// Sheet on mobile. Use for details / properties / layers / settings panels.
export function AppInspector({
  open,
  onOpenChange,
  railOpen = true,
  title = "Details",
  description,
  railClassName,
  sheetClassName,
  mobile = "sheet",
  mobileHeight,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  railOpen?: boolean;
  title?: string;
  description?: string;
  railClassName?: string;
  sheetClassName?: string;
  /** Mobile form: right Sheet (default) or a non-modal bottom drawer that keeps
   *  the canvas/preview visible above it (e.g. image editor). */
  mobile?: "sheet" | "drawer";
  mobileHeight?: string;
  children: ReactNode;
}) {
  return (
    <SideRegion
      open={open}
      onOpenChange={onOpenChange}
      side="right"
      railOpen={railOpen}
      title={title}
      description={description}
      railBase="flex w-64 shrink-0 flex-col border-l border-border bg-card/30"
      railClassName={railClassName}
      sheetWidth="w-80 sm:max-w-sm"
      sheetClassName={sheetClassName}
      mobileVariant={mobile}
      mobileHeight={mobileHeight}
    >
      {children}
    </SideRegion>
  );
}
