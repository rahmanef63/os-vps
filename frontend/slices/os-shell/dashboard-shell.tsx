"use client";
/* Dashboard shell — a single-pane cockpit surface (no floating windows):
   sidebar + breadcrumb + content. Lives in the os-shell CONSUMER (not the
   appshell framework) because its home page reads Topside capabilities
   (system stats); the framework stays data-agnostic. Apps mount inline via
   <AppHost> — the SAME lazy-loaded components the windowed shells render —
   so a file open here shares state with macOS/Windows windows. */
import { useState } from "react";
import { LayoutDashboard, Home, Activity, Cpu, MemoryStick, HardDrive } from "lucide-react";
import {
  registerShell, AppHost, AppIcon, useApps, useSystemStats,
  type AppDescriptor,
} from "@/features/appshell";

type Route = { view: "home" } | { view: "app"; appId: string; title: string };

function DashboardShell() {
  const [route, setRoute] = useState<Route>({ view: "home" });
  const apps = useApps().filter((a) => !a.noDock);
  const openApp = (appId: string, title: string) => setRoute({ view: "app", appId, title });
  const home = () => setRoute({ view: "home" });

  return (
    <div className="absolute inset-0 z-[10] flex bg-background">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card/50">
        <div className="flex h-14 shrink-0 items-center gap-2 px-4 text-sm font-semibold">
          <LayoutDashboard className="size-4 text-primary" /> Topside
        </div>

        <div className="flex flex-col gap-0.5 px-2">
          <NavItem active={route.view === "home"} onClick={home} icon={<Home className="size-4" />} label="Home" />
        </div>

        <div className="px-4 pb-1.5 pt-4 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Apps</div>
        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-auto px-2 pb-3">
          {apps.map((a) => (
            <NavItem
              key={a.id}
              active={route.view === "app" && route.appId === a.id}
              onClick={() => openApp(a.id, a.title)}
              icon={<span className="size-5"><AppIcon app={a} /></span>}
              label={a.title}
            />
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-5 text-sm">
          <button onClick={home} className="text-muted-foreground transition-colors hover:text-foreground">Home</button>
          {route.view === "app" && (
            <>
              <span className="text-muted-foreground/50">/</span>
              <span className="font-medium">{route.title}</span>
            </>
          )}
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">
          {route.view === "home" ? (
            <DashboardHome apps={apps} onOpenApp={openApp} />
          ) : (
            <AppHost key={route.appId} app={route.appId} />
          )}
        </main>
      </div>
    </div>
  );
}

function DashboardHome({ apps, onOpenApp }: { apps: AppDescriptor[]; onOpenApp: (id: string, title: string) => void }) {
  const stats = useSystemStats();
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
                onClick={() => onOpenApp("system-monitor", "System Monitor")}
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
              onClick={() => onOpenApp(a.id, a.title)}
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

function fmtGb(bytes: number): string {
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function NavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-9">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

registerShell({
  id: "dashboard",
  label: "Dashboard",
  icon: Activity,
  surface: "desktop",
  group: "Desktop",
  wallpaper: "graphite",
  render: DashboardShell,
});

export { DashboardShell };
