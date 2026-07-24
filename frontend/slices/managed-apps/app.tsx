"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, Boxes, FileText, Loader2, Play, RefreshCw, Save, Square, Workflow } from "lucide-react";
import type { ManagedAppAction, ManagedAppId, ManagedAppView } from "@/lib/managed-apps/types";

function useManagedApps() {
  const [apps, setApps] = useState<ManagedAppView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/managed-apps", { cache: "no-store" });
      const payload = await response.json() as { apps?: ManagedAppView[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Managed applications unavailable");
      setApps(payload.apps ?? []);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Managed applications unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(refresh, 10_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const act = useCallback(async (id: ManagedAppId, action: ManagedAppAction) => {
    if ((action === "stop" || action === "restart") && !window.confirm(`${action === "stop" ? "Stop" : "Restart"} ${id}?`)) return;
    setBusy(`${id}:${action}`);
    try {
      const response = await fetch(`/api/v1/managed-apps/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json() as { app?: ManagedAppView; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Operation failed");
      if (payload.app) setApps((current) => current.map((app) => app.id === id ? payload.app! : app));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Operation failed");
    } finally {
      setBusy(null);
      void refresh();
    }
  }, [refresh]);

  return { apps, error, loading, busy, refresh, act };
}

export default function ManagedApplications() {
  return <ManagedAppsSurface />;
}

export function HermesApp() {
  return <ManagedAppsSurface focus="hermes" />;
}

export function OpenClawApp() {
  return <ManagedAppsSurface focus="openclaw" />;
}

function ManagedAppsSurface({ focus }: { focus?: ManagedAppId }) {
  const state = useManagedApps();
  const visible = useMemo(() => focus ? state.apps.filter((app) => app.id === focus) : state.apps, [focus, state.apps]);
  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          {focus === "hermes" ? <Bot className="size-4 text-violet-400" /> : focus === "openclaw" ? <Workflow className="size-4 text-orange-400" /> : <Boxes className="size-4 text-sky-400" />}
          <div>
            <h2 className="text-sm font-semibold">{focus === "hermes" ? "Hermes" : focus === "openclaw" ? "OpenClaw" : "Applications"}</h2>
            <p className="text-[11px] text-muted-foreground">MSO management layer · independent runtime and state</p>
          </div>
        </div>
        <button type="button" onClick={() => void state.refresh()} className="rounded-md border border-border p-2 text-muted-foreground hover:text-foreground" aria-label="Refresh applications"><RefreshCw className="size-3.5" /></button>
      </header>
      <main className="min-h-0 flex-1 overflow-auto p-4">
        {state.error && <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{state.error}</div>}
        {state.loading ? <div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Detecting applications…</div> : (
          <div className={`grid gap-4 ${focus ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}>
            {visible.map((app) => <ManagedCard key={app.id} app={app} busy={state.busy} onAction={state.act} />)}
          </div>
        )}
      </main>
    </div>
  );
}

function ManagedCard({ app, busy, onAction }: { app: ManagedAppView; busy: string | null; onAction: (id: ManagedAppId, action: ManagedAppAction) => Promise<void> }) {
  const [logs, setLogs] = useState<string[] | null>(null);
  const icon = app.id === "hermes" ? <Bot className="size-5 text-violet-400" /> : <Workflow className="size-5 text-orange-400" />;
  const run = app.state === "running";
  async function loadLogs() {
    const response = await fetch(`/api/v1/managed-apps/${app.id}/logs`, { cache: "no-store" });
    const payload = await response.json() as { entries?: string[] };
    setLogs(payload.entries ?? []);
  }
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">{icon}<div><h3 className="text-sm font-semibold">{app.name}</h3><p className="text-xs text-muted-foreground">{app.description}</p></div></div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${run ? "bg-emerald-500/15 text-emerald-400" : app.state === "unhealthy" ? "bg-red-500/15 text-red-400" : "bg-muted text-muted-foreground"}`}>{app.state}</span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div><dt className="text-muted-foreground">Installation</dt><dd className="font-medium">{app.installationType}</dd></div>
        <div><dt className="text-muted-foreground">Version</dt><dd className="truncate font-medium">{app.version ?? "—"}</dd></div>
        <div><dt className="text-muted-foreground">Health</dt><dd className="font-medium">{app.healthy === null ? "unknown" : app.healthy ? "healthy" : "unhealthy"}</dd></div>
        <div><dt className="text-muted-foreground">Isolation</dt><dd className="font-medium">independent</dd></div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        {!run && app.supportedActions.includes("start") && <Action icon={<Play />} label="Start" busy={busy === `${app.id}:start`} onClick={() => void onAction(app.id, "start")} />}
        {run && app.supportedActions.includes("stop") && <Action icon={<Square />} label="Stop" busy={busy === `${app.id}:stop`} onClick={() => void onAction(app.id, "stop")} />}
        {app.supportedActions.includes("restart") && <Action icon={<RefreshCw />} label="Restart" busy={busy === `${app.id}:restart`} onClick={() => void onAction(app.id, "restart")} />}
        {app.supportedActions.includes("backup") && <Action icon={<Save />} label="Backup" busy={busy === `${app.id}:backup`} onClick={() => void onAction(app.id, "backup")} />}
        <Action icon={<FileText />} label="Logs" busy={false} onClick={() => void loadLogs()} />
      </div>
      {logs && <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-black/30 p-3 text-[10px] leading-relaxed text-muted-foreground">{logs.length ? logs.join("\n") : "Logs unavailable"}</pre>}
    </section>
  );
}

function Action({ icon, label, busy, onClick }: { icon: React.ReactElement<{ className?: string }>; label: string; busy: boolean; onClick: () => void }) {
  return <button type="button" disabled={busy} onClick={onClick} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted disabled:opacity-50">{busy ? <Loader2 className="size-3.5 animate-spin" /> : <span className="[&>svg]:size-3.5">{icon}</span>}{busy ? "Working…" : label}</button>;
}
