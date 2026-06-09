"use client";

import { Cpu, HardDrive, MemoryStick } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useApps,
  useShellUI,
  useSystemStats,
  useQuickLinks,
  AppIcon,
  QuicklinkIcon,
  type AppDescriptor,
} from "@/features/appshell";

import { Bar, Card, Row, gb } from "./widget-cards";

// Today view (swipe right from home) — live system widgets + quick shortcuts.
// Real data only (system telemetry capability); no clock or fake hardware status.
// Apps + quick set + launch come from the registry + shell-UI context.
export function MobileWidgets() {
  const apps = useApps();
  const { quickAppIds: quickIds, openApp: onOpen } = useShellUI();
  const s = useSystemStats();
  const { items: links, open: openLink } = useQuickLinks();

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

      {links.length > 0 && (
        <Card>
          <span className="mb-2 block text-[12px] font-semibold text-muted-foreground">Quicklinks</span>
          <div className="grid grid-cols-4 gap-3">
            {links.map((link) => (
              <Button key={link.id} type="button" variant="ghost" onClick={() => openLink(link)} className="h-auto p-0 hover:bg-transparent flex flex-col items-center gap-1.5">
                <span className="size-11">
                  <QuicklinkIcon link={link} />
                </span>
                <span className="max-w-[56px] truncate text-[10.5px] font-medium">{link.title}</span>
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

