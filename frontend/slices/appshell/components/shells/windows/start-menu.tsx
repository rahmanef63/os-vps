"use client";
/* Windows 11 Start menu — search, Pinned grid ⇄ All apps list, Recommended
   (recent apps), and a footer with the user tile + Power. Launch goes through
   the shared store's openWindow (singleton unless the app is multi). */
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { Search, ChevronRight, Power, CircleUserRound } from "lucide-react";
import { useApps } from "../../../lib/registry";
import { openWindow } from "../../../lib/store";
import { useRecents } from "../../../lib/recents";
import { useBrand } from "../../../registry/brand";
import { lock } from "../../../lib/lock";
import { AppIcon } from "../../app-icon";
import type { AppDescriptor } from "../../../lib/types";

const NEUTRAL = "h-auto p-0 font-normal hover:bg-transparent";

export function StartMenu({ onClose }: { onClose: () => void }) {
  const apps = useApps().filter((a) => !a.noDock);
  const brand = useBrand();
  const recents = useRecents();
  const [q, setQ] = useState("");
  const [allApps, setAllApps] = useState(false);

  const query = q.trim().toLowerCase();
  const filtered = useMemo(
    () => apps.filter((a) => a.title.toLowerCase().includes(query)),
    [apps, query],
  );
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => a.title.localeCompare(b.title)),
    [filtered],
  );
  // Recommended = recent apps resolved to live descriptors (skip uninstalled), top 4.
  const recommended = useMemo(() => {
    const byId = new Map(apps.map((a) => [a.id, a] as const));
    return recents
      .map((r) => byId.get(r.app))
      .filter((a): a is AppDescriptor => !!a)
      .slice(0, 4);
  }, [recents, apps]);

  const launch = (app: AppDescriptor) => {
    openWindow(app.id, app.title, app.defaultSize, undefined, { multi: app.multi });
    onClose();
  };

  const searching = query.length > 0;
  const listView = allApps && !searching;

  return (
    <>
      <div className="absolute inset-0 z-[59]" onClick={onClose} />
      <div className="absolute bottom-14 left-1/2 z-[61] flex w-[560px] max-w-[92vw] -translate-x-1/2 flex-col rounded-xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-xl font-[family-name:var(--shell-font)]">
        {/* search */}
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

        {/* section header + Pinned ⇄ All apps toggle */}
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {searching ? "Results" : listView ? "All apps" : "Pinned"}
          </span>
          {!searching && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAllApps((v) => !v)}
              className={`${NEUTRAL} flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted`}
            >
              {listView ? "Pinned" : "All apps"} <ChevronRight className="size-3.5" />
            </Button>
          )}
        </div>

        {/* body: alphabetical list (All apps) or icon grid (Pinned / results) */}
        {listView ? (
          <div className="max-h-[300px] overflow-y-auto pr-1">
            {sorted.map((app) => (
              <Button
                type="button"
                variant="ghost"
                key={app.id}
                onClick={() => launch(app)}
                className={`${NEUTRAL} flex w-full items-center justify-start gap-3 rounded-md px-2 py-1.5 hover:bg-muted`}
              >
                <span className="size-7">
                  <AppIcon app={app} />
                </span>
                <span className="truncate text-sm">{app.title}</span>
              </Button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {filtered.map((app) => (
              <Button
                type="button"
                variant="ghost"
                key={app.id}
                onClick={() => launch(app)}
                className={`${NEUTRAL} flex flex-col items-center gap-1.5 rounded-lg p-2 hover:bg-muted`}
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
        )}

        {/* Recommended — recent apps, default (non-search, non-all-apps) view only */}
        {!searching && !listView && recommended.length > 0 && (
          <>
            <div className="mb-2 mt-4 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Recommended
            </div>
            <div className="grid grid-cols-2 gap-2">
              {recommended.map((app) => (
                <Button
                  type="button"
                  variant="ghost"
                  key={app.id}
                  onClick={() => launch(app)}
                  className={`${NEUTRAL} flex items-center justify-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted`}
                >
                  <span className="size-7">
                    <AppIcon app={app} />
                  </span>
                  <span className="truncate text-xs">{app.title}</span>
                </Button>
              ))}
            </div>
          </>
        )}

        {/* footer: user tile + Power (lock — a headless VPS has no power-off) */}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              openWindow("os-settings", "Settings");
              onClose();
            }}
            className={`${NEUTRAL} flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted`}
          >
            <CircleUserRound className="size-6 text-muted-foreground" />
            <span className="text-sm">{brand.name}</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            aria-label="Lock"
            onClick={() => {
              lock();
              onClose();
            }}
            className={`${NEUTRAL} grid size-9 place-items-center rounded-md hover:bg-muted`}
          >
            <Power className="size-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
