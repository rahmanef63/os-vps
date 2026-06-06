"use client";
/* Windows Start menu — pinned apps grid + search. Launch goes through the shared
   store's openWindow (singleton unless the app is multi). */
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useApps } from "../../../lib/registry";
import { openWindow } from "../../../lib/store";
import { AppIcon } from "../../app-icon";
import type { AppDescriptor } from "../../../lib/types";

export function StartMenu({ onClose }: { onClose: () => void }) {
  const apps = useApps().filter((a) => !a.noDock);
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => apps.filter((a) => a.title.toLowerCase().includes(q.toLowerCase())),
    [apps, q],
  );
  const launch = (app: AppDescriptor) => {
    openWindow(app.id, app.title, app.defaultSize, undefined, { multi: app.multi });
    onClose();
  };
  return (
    <>
      <div className="absolute inset-0 z-[59]" onClick={onClose} />
      <div className="absolute bottom-14 left-1/2 z-[61] w-[560px] max-w-[92vw] -translate-x-1/2 rounded-xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-xl">
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <Search className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search apps"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Pinned</div>
        <div className="grid grid-cols-5 gap-2">
          {filtered.map((app) => (
            <Button type="button" variant="ghost"
              key={app.id}
              onClick={() => launch(app)}
              className="h-auto p-0 font-normal hover:bg-transparent flex flex-col items-center gap-1.5 rounded-lg p-2 hover:bg-muted"
            >
              <span className="size-10">
                <AppIcon app={app} />
              </span>
              <span className="w-full truncate text-center text-[11px]">{app.title}</span>
            </Button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-5 py-6 text-center text-xs text-muted-foreground">No apps</div>
          )}
        </div>
      </div>
    </>
  );
}
