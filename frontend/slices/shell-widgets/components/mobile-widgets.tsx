"use client";

import { Cpu, HardDrive, MemoryStick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApps, useShellUI, useSystemStats, AppIcon, type AppDescriptor } from "@/features/appshell";

function gb(bytes: number): string {
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

// Today view (swipe right from home) — live system widgets + quick shortcuts.
// Real data only (system telemetry capability); no clock or fake hardware status.
// Apps + quick set + launch come from the registry + shell-UI context.
export function MobileWidgets() {
  const apps = useApps();
  const { quickAppIds: quickIds, openApp: onOpen } = useShellUI();
  const s = useSystemStats();

  const quick = quickIds.map((id) => apps.find((a) => a.id === id)).filter(Boolean) as AppDescriptor[];

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto px-4 py-3 [scrollbar-width:none]">
      <h2 className="px-1 text-lg font-bold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">Today</h2>

      <Card>
        <Row icon={Cpu} label="CPU" value={s ? `${s.cpu.pct}%` : "—"} sub={s ? `${s.cpu.cores} cores` : ""} />
        <Bar pct={s?.cpu.pct ?? 0} />
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <Row
            icon={MemoryStick}
            label="Memory"
            value={s ? gb(s.mem.used) : "—"}
            sub={s ? `of ${gb(s.mem.total)}` : ""}
          />
          <Bar pct={s ? (s.mem.used / s.mem.total) * 100 : 0} />
        </Card>
        <Card>
          <Row
            icon={HardDrive}
            label="Storage"
            value={s ? gb(s.disk.used) : "—"}
            sub={s ? `of ${gb(s.disk.total)}` : ""}
          />
          <Bar pct={s ? (s.disk.used / s.disk.total) * 100 : 0} />
        </Card>
      </div>

      {quick.length > 0 && (
        <Card>
          <span className="mb-2 block text-[12px] font-semibold text-muted-foreground">Quick open</span>
          <div className="flex gap-4">
            {quick.map((app) => (
              <Button key={app.id} type="button" variant="ghost" onClick={() => onOpen(app)} className="h-auto p-0 hover:bg-transparent flex flex-col items-center gap-1.5">
                <span className="size-12">
                  <AppIcon app={app} />
                </span>
                <span className="max-w-[56px] truncate text-[10.5px] font-medium">{app.title}</span>
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border border-white/15 p-3.5 text-foreground backdrop-blur-xl"
      style={{ background: "var(--glass-menu)" }}
    >
      {children}
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <Icon className="size-4 text-muted-foreground" />
      <span className="text-[12.5px] font-semibold">{label}</span>
      <span className="ml-auto text-[12.5px] font-bold tabular-nums">{value}</span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

function Bar({ pct }: { pct: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-500"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}
