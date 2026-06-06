"use client";

import { useMemo, useState } from "react";
import { Search, Store } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { usePublishInspector } from "./lib/host";
import { StoreSidebar, type StoreFilter } from "./components/store-sidebar";
import { FeaturedCard } from "./components/featured-card";
import { StoreAppCard } from "./components/store-app-card";
import { SystemCard } from "./components/system-card";
import {
  FEATURED_ID,
  mergeCatalog,
  type CatalogApp,
} from "./lib/store-catalog";
import { SYSTEM_CATALOG, type SystemEntry } from "./lib/system-catalog";
import { setInstalled, useApps } from "./lib/apps-store";
import { setEnabled, useDisabledIds } from "./lib/enabled-store";

// Default export so os-shell can lazy-load it as a window app. Installing an app
// flips its localStorage row (useInstalledApps surfaces it in the dock/launchpad).
// The "Apps"/"Features" sections instead toggle the built-in apps + shell features
// on/off (enabled-store) — os-root filters the manifest by the disabled set.
export default function AppStore() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StoreFilter>("Featured");
  const [busy, setBusy] = useState<string | null>(null);

  const rows = useApps();
  const disabled = useDisabledIds();
  const off = useMemo(() => new Set(disabled), [disabled]);
  const isSystem = filter === "Apps" || filter === "Features";

  // Merge curated catalog with live install state from localStorage.
  const catalog = useMemo(() => mergeCatalog(rows), [rows]);
  const featured = catalog.find((a) => a.appId === FEATURED_ID) ?? catalog[0];

  const toggle = async (app: CatalogApp) => {
    setBusy(app.appId);
    try {
      setInstalled({
        appId: app.appId,
        installed: !app.installed,
        title: app.title,
        glyph: app.glyph,
        gradient: app.gradient,
        runtime: app.runtime,
        entry: app.entry,
      });
    } finally {
      setBusy(null);
    }
  };

  const toggleSystem = (e: SystemEntry) => setEnabled(e.id, off.has(e.id));

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((a) => {
      if (filter !== "Featured" && a.category !== filter) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q)
      );
    });
  }, [catalog, query, filter]);

  const systemList = useMemo(() => {
    const q = query.trim().toLowerCase();
    const kind = filter === "Features" ? "feature" : "app";
    return SYSTEM_CATALOG.filter(
      (e) =>
        e.kind === kind &&
        (!q || e.title.toLowerCase().includes(q) || e.desc.toLowerCase().includes(q)),
    );
  }, [filter, query]);

  const count = isSystem ? systemList.length : list.length;
  const noun = isSystem ? (filter === "Features" ? "feature" : "app") : "app";
  const installedCount = catalog.filter((a) => a.installed).length;

  // Surface store state to the shell AI Inspector.
  usePublishInspector(
    "app-store",
    {
      subject: "App Store",
      props: [
        { label: "Installed", value: String(installedCount) },
        { label: "Catalog", value: String(catalog.length) },
        { label: "Uninstalled", value: String(disabled.length) },
      ],
      context: `App store, ${installedCount} installed, ${disabled.length} uninstalled`,
      suggestions: ["Suggest an app", "What's installed?"],
    },
    [installedCount, catalog.length, disabled.length],
  );

  return (
    <div className="flex h-full">
      <StoreSidebar value={filter} onChange={setFilter} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <Store className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">App Store</h2>
            <span className="ml-auto text-[11px] text-muted-foreground">
              {count} {count === 1 ? noun : `${noun}s`}
            </span>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isSystem ? `Search ${noun}s` : "Search apps"}
              className="h-9 pl-8"
            />
          </div>
        </header>

        <Separator />

        <ScrollArea className="min-h-0 flex-1">
          <div className="@container p-4">
            {isSystem ? (
              <>
                <p className="mb-3 text-xs text-muted-foreground">
                  Optional {filter === "Features" ? "system features" : "apps"} — install to add
                  them, uninstall to remove. Uninstalled items vanish from the dock, Launchpad,
                  and Spotlight.
                </p>
                <div className="grid grid-cols-1 gap-3 @md:grid-cols-2 @4xl:grid-cols-3">
                  {systemList.map((e) => (
                    <SystemCard
                      key={e.id}
                      entry={e}
                      installed={!off.has(e.id)}
                      onToggle={toggleSystem}
                    />
                  ))}
                </div>
              </>
            ) : (
              <>
                {filter === "Featured" && featured && !query && (
                  <FeaturedCard
                    app={featured}
                    busy={busy === featured.appId}
                    onToggle={toggle}
                  />
                )}

                {list.length === 0 ? (
                  <p className="py-12 text-center text-xs text-muted-foreground">
                    No apps match &ldquo;{query}&rdquo;.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 @md:grid-cols-2 @4xl:grid-cols-3">
                    {list.map((app) => (
                      <StoreAppCard
                        key={app.appId}
                        app={app}
                        busy={busy === app.appId}
                        onToggle={toggle}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
