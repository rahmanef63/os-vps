"use client";
/* Dashboard shell pieces — sidebar rows + the Home overview (host stats + app
   grid). Split from dashboard-shell.tsx to keep both under the 200-line rule;
   only the Dashboard shell composes these. */
import { X, Cpu, MemoryStick, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppIcon } from "../../app-icon";
import { useApps } from "../../../lib/registry";
import { useSystemStats } from "../../../registry/capabilities";
import { useWindow } from "../../../hooks/use-shell";
import { closeWindow } from "../../../lib/store";
import type { AppDescriptor } from "../../../lib/types";

export function DashboardHome({ apps, onOpenApp }: { apps: AppDescriptor[]; onOpenApp: (app: AppDescriptor) => void }) {
  const stats = useSystemStats();
  const monitor = apps.find((a) => a.id === "system-monitor");
  const cards = stats
    ? [
        { icon: Cpu, label: "CPU", value: `${Math.round(stats.cpu.pct)}%`, hint: `${stats.cpu.cores} cores` },
        { icon: MemoryStick, label: "Memory", value: `${Math.round((stats.mem.used / stats.mem.total) * 100)}%`, hint: fmtGb(stats.mem.used) + " / " + fmtGb(stats.mem.total) },
        { icon: HardDrive, label: "Disk", value: `${Math.round((stats.disk.used / stats.disk.total) * 100)}%`, hint: fmtGb(stats.disk.used) + " / " + fmtGb(stats.disk.total) },
      ]
    : [];

  return (
    <div className="mx-auto h-full max-w-6xl overflow-auto px-8 py-7">
      <h1 className="mb-1 text-xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mb-8 text-sm text-muted-foreground">Your VPS, one pane at a time.</p>

      {cards.length > 0 && (
        <Section title="Host">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {cards.map((c) => (
              <button
                key={c.label}
                onClick={() => monitor && onOpenApp(monitor)}
                className="flex items-center gap-3.5 rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><c.icon className="size-5" /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{c.label} · {c.value}</span>
                  <span className="block truncate text-xs text-muted-foreground">{c.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </Section>
      )}

      <Section title="Apps">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {apps.map((a) => (
            <button
              key={a.id}
              onClick={() => onOpenApp(a)}
              className="flex flex-col items-start gap-1.5 rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
            >
              <span className="size-10"><AppIcon app={a} /></span>
              <span className="mt-1.5 w-full truncate text-sm font-medium">{a.title}</span>
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* A sidebar row for an OPEN window: click resumes (restore + focus), the ✕
   closes it in the shared store — exactly the taskbar/dock affordances. */
export function RunningRow({ id, active, onPick }: { id: string; active: boolean; onPick: () => void }) {
  const win = useWindow(id);
  const apps = useApps();
  if (!win) return null;
  const app = apps.find((a) => a.id === win.app);
  return (
    <div className={`group flex items-center rounded-md ${active ? "bg-primary/10" : "hover:bg-muted"}`}>
      <button
        onClick={onPick}
        className={`flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-sm transition-colors ${
          active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {app && <span className="size-5 shrink-0"><AppIcon app={app} /></span>}
        <span className="truncate">{win.title}</span>
      </button>
      <Button type="button" variant="ghost" size="icon"
        aria-label={`Close ${win.title}`}
        onClick={() => closeWindow(id)}
        className="mr-1 size-6 shrink-0 rounded text-muted-foreground opacity-0 hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}

export function NavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
        active ? "bg-primary/10 font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

export function SidebarLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 pb-1.5 pt-4 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-9">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function fmtGb(bytes: number): string {
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}
