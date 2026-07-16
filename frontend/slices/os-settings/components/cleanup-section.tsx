"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { IS_DEMO } from "@/lib/demo";
import { Switch } from "@/components/ui/switch";
import {
  SettingsSection,
  SettingsValueRow,
  SettingsActionRow,
} from "@/features/shell-settings";

type Item = { id: string; label: string; desc: string; bytes: number; available: boolean };
type Result = { id: string; ok: boolean; freedBytes: number; error?: string };

function fmt(n: number): string {
  if (n < 1e3) return `${n} B`;
  if (n < 1e6) return `${Math.round(n / 1e3)} kB`;
  if (n < 1e9) return `${Math.round(n / 1e6)} MB`;
  return `${(n / 1e9).toFixed(1)} GB`;
}

// One-tap safe disk cleanup. Every row is a server-side allowlisted category
// (caches, old logs, trash, dangling docker layers) that can be deleted without
// breaking anything — the checklist is the filter; the single button runs it.
export function CleanupSection() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<"scan" | "clean" | null>("scan");
  const [freed, setFreed] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pure fetch (no setState) so effects can use the .then form
  // (react-hooks/set-state-in-effect).
  const fetchItems = useCallback(async (): Promise<Item[]> => {
    const r = await fetch("/api/v1/sys/cleanup", { cache: "no-store" });
    if (!r.ok) throw new Error(`scan failed (${r.status})`);
    return ((await r.json()) as { items: Item[] }).items;
  }, []);

  const applyScan = useCallback((list: Item[]) => {
    setItems(list);
    // Everything listed is safe — pre-check every row that has something to free.
    setSel(new Set(list.filter((i) => i.available && i.bytes > 0).map((i) => i.id)));
    setBusy(null);
  }, []);

  useEffect(() => {
    if (IS_DEMO) return;
    let alive = true;
    fetchItems().then(
      (list) => alive && applyScan(list),
      (e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : String(e));
        setBusy(null);
      },
    );
    return () => {
      alive = false;
    };
  }, [fetchItems, applyScan]);

  const rescan = () => {
    setBusy("scan");
    setError(null);
    fetchItems().then(applyScan, (e) => {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
    });
  };

  const clean = async () => {
    setBusy("clean");
    setError(null);
    setFreed(null);
    try {
      const r = await fetch("/api/v1/sys/cleanup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: [...sel] }),
      });
      if (!r.ok) throw new Error(`cleanup failed (${r.status})`);
      const { results } = (await r.json()) as { results: Result[] };
      setFreed(results.reduce((a, x) => a + x.freedBytes, 0));
      const failed = results.filter((x) => !x.ok);
      if (failed.length) setError(`${failed.length} item(s) failed: ${failed.map((f) => f.id).join(", ")}`);
      applyScan(await fetchItems());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  };

  if (IS_DEMO)
    return (
      <SettingsSection
        icon={<Trash2 />}
        title="Cleanup"
        footnote="Disabled in the demo. In a live deployment this frees disk space from caches, old logs and trash — all safe to delete."
      >
        <SettingsValueRow label="Status" value="Disabled in demo" />
      </SettingsSection>
    );

  const toggle = (id: string, on: boolean) =>
    setSel((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const selectedBytes = (items ?? [])
    .filter((i) => sel.has(i.id))
    .reduce((a, i) => a + i.bytes, 0);

  return (
    <SettingsSection
      icon={<Trash2 />}
      title="Cleanup"
      footnote="Everything listed is safe to remove: download caches, logs older than 7 days, trash and unused docker layers. Your files, apps and running services are never touched."
    >
      {items === null && (
        <SettingsValueRow label="Scanning…" value={error ?? "measuring reclaimable space"} />
      )}
      {items?.map((i) => (
        <div
          key={i.id}
          data-slot="settings-row"
          className="relative flex min-h-[46px] items-center gap-3 px-4 py-[11px] after:absolute after:inset-x-0 after:bottom-0 after:left-4 after:h-px after:bg-border/60 last:after:hidden"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm text-foreground">{i.label}</p>
            <p className="truncate text-xs text-muted-foreground">
              {i.available ? i.desc : "Not available on this server"}
            </p>
          </div>
          <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
            {i.available ? fmt(i.bytes) : "—"}
          </span>
          <Switch
            checked={sel.has(i.id)}
            disabled={!i.available || busy !== null}
            onCheckedChange={(on) => toggle(i.id, on)}
            aria-label={`Include ${i.label}`}
          />
        </div>
      ))}
      {freed !== null && <SettingsValueRow label="Last cleanup freed" value={fmt(freed)} />}
      {error && items !== null && <SettingsValueRow label="Problem" value={error} />}
      <SettingsActionRow
        label={sel.size ? `Clean up — free about ${fmt(selectedBytes)}` : "Nothing selected"}
        icon={<Trash2 />}
        onClick={clean}
        busy={busy === "clean"}
        disabled={!sel.size || busy !== null}
      />
      <SettingsActionRow
        label="Rescan"
        icon={<RefreshCw />}
        onClick={rescan}
        busy={busy === "scan"}
        disabled={busy !== null}
      />
    </SettingsSection>
  );
}
