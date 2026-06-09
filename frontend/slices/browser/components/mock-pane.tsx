"use client";

// Mock/demo stand-in for the remote view. The Browser drives a REAL headless
// Chromium on the host — there is nothing useful to fake, so instead of
// polling the live endpoints (501 spam + an eternal "Loading…" pane) we park
// on this notice until the server target is Live.
import { Globe } from "lucide-react";

export function MockPane({ demo }: { demo: boolean }) {
  return (
    <div className="grid size-full place-items-center bg-background p-6">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <div className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <Globe className="size-6" />
        </div>
        <p className="text-sm font-medium">Browser needs the live host</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {demo
            ? "This demo runs on mock data — the Browser drives a real headless Chromium on the VPS, so there's nothing to show here."
            : "You're on mock data. Switch Settings → Server → Live to drive the headless Chromium on the VPS."}
        </p>
      </div>
    </div>
  );
}
