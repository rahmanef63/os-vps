"use client";

import * as React from "react";
import dynamic from "next/dynamic";

import type {
  ResponsiveDialogVariant,
  ResponsiveDialogSize,
  ResponsiveDialogMobileVariant,
  ResponsiveDialogSide,
} from "./responsive-dialog-context";

export type {
  ResponsiveDialogVariant,
  ResponsiveDialogSize,
  ResponsiveDialogMobileVariant,
  ResponsiveDialogSide,
} from "./responsive-dialog-context";

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

// radix Dialog/AlertDialog + Sheet + vaul Drawer (and the header/body/footer
// parts) are the biggest first-load lever (~88KB gz). They rode into the eager
// desktop bundle only because a CLOSED ResponsiveDialog (the WidgetPicker in the
// desktopWidgets slot) mounts at first paint. next/dynamic moves the whole set
// into an async chunk fetched the first time a dialog OPENS; desktop first paint
// ships none of it. All six share loadShell() → one deduped chunk.
const loadShell = () => import("./responsive-dialog-shell");
const ResponsiveDialogShell = dynamic(() => loadShell().then((m) => m.ResponsiveDialogShell), { ssr: false, loading: () => null });
const ResponsiveDialogHeader = dynamic(() => loadShell().then((m) => m.ResponsiveDialogHeader), { ssr: false, loading: () => null });
const ResponsiveDialogTitle = dynamic(() => loadShell().then((m) => m.ResponsiveDialogTitle), { ssr: false, loading: () => null });
const ResponsiveDialogDescription = dynamic(() => loadShell().then((m) => m.ResponsiveDialogDescription), { ssr: false, loading: () => null });
const ResponsiveDialogBody = dynamic(() => loadShell().then((m) => m.ResponsiveDialogBody), { ssr: false, loading: () => null });
const ResponsiveDialogFooter = dynamic(() => loadShell().then((m) => m.ResponsiveDialogFooter), { ssr: false, loading: () => null });

function ResponsiveDialogRoot(props: ResponsiveDialogProps) {
  // Gate on "has ever opened": a permanently-closed dialog (the eager
  // WidgetPicker etc.) renders nothing and fetches nothing. Latch via the
  // adjust-state-during-render pattern (no effect → no set-state-in-effect);
  // once opened the shell stays mounted so radix/vaul exit animations play.
  const [everOpened, setEverOpened] = React.useState(props.open);
  if (props.open && !everOpened) setEverOpened(true);
  if (!everOpened) return null;
  return <ResponsiveDialogShell {...props} />;
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
