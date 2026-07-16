"use client";

import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AppIcon } from "./app-icon";
import type { AppDescriptor } from "../lib/types";
import type { InspectorAction } from "../lib/inspector";

// Mobile in-app action drawer: the RUNNING app's live inspector actions raised as
// a bottom sheet from the nav-bar "•••". Same bus that feeds the desktop menu-bar
// app menu — one source, both surfaces. shadcn Sheet gives the slide-up, scrim,
// Esc + focus-trap for free (matches the mock's translateY(102%→0) bottom sheet).
export function AppActionsSheet({
  app,
  actions,
  open,
  onOpenChange,
}: {
  app: AppDescriptor;
  actions: InspectorAction[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-border bg-card p-0 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)]"
      >
        <SheetTitle className="flex items-center gap-2.5 px-4 pt-4 text-[15px]">
          <span className="size-9">
            <AppIcon app={app} />
          </span>
          {app.title}
        </SheetTitle>
        <SheetDescription className="sr-only">Quick actions for {app.title}</SheetDescription>
        <div className="mt-2 max-h-[50vh] overflow-auto">
          {actions.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No actions</p>
          ) : (
            actions.map((a) => (
              <Button
                key={a.id}
                type="button"
                variant="ghost"
                onClick={() => {
                  onOpenChange(false);
                  void a.run();
                }}
                className="h-auto block w-full justify-start rounded-none border-t border-border px-4 py-3.5 text-left text-[15px] font-medium"
              >
                {a.label}
              </Button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
