"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOsApi } from "@/lib/os-api";
import type { SysStats, FsUsage } from "@/lib/os-api";
import { Section } from "./section";

const APP_NAME = "Topside";
const APP_TAGLINE = "VPS cockpit";

function gb(bytes: number) {
  return `${Math.round(bytes / 1e9)} GB`;
}

function uptime(sec: number) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
}

// Wipes appearance + device identity, then reloads fresh. Storage keys keep the
// historical "os-vps" prefix (changing them would orphan existing device ids).
function resetOsVps() {
  if (typeof window === "undefined") return;
  if (!window.confirm("Reset Topside? This clears appearance + device identity.")) return;
  try {
    localStorage.removeItem("os-vps:tweaks");
    localStorage.removeItem("os-vps.device.id");
    localStorage.removeItem("os-vps:demo-fs");
  } catch {
    /* private mode / quota */
  }
  window.location.reload();
}

export function AboutSection() {
  const api = useOsApi();
  const [stats, setStats] = useState<SysStats | null>(null);
  const [usage, setUsage] = useState<FsUsage | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([api.sys.stats(), api.fs.usage()])
      .then(([s, u]) => {
        if (!alive) return;
        setStats(s);
        setUsage(u);
      })
      .catch(() => {
        /* leave placeholders */
      });
    return () => {
      alive = false;
    };
  }, [api]);

  const rows: [string, string][] = [
    ["Cores", stats ? String(stats.cpu.cores) : "—"],
    ["Memory", stats ? gb(stats.mem.total) : "—"],
    ["Disk", stats ? gb(stats.disk.total) : "—"],
    ["Uptime", stats ? uptime(stats.uptime) : "—"],
    ["Storage used", usage ? `${gb(usage.used)} of ${gb(usage.total)}` : "—"],
  ];

  return (
    <Section icon={<Info />} title="About">
      <div className="flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-2xl bg-primary text-lg font-black tracking-tight text-primary-foreground">
          ts
        </div>
        <div>
          <div className="text-base font-bold tracking-tight text-foreground">
            {APP_NAME}
          </div>
          <div className="text-xs text-muted-foreground">
            {APP_NAME} · {APP_TAGLINE}
          </div>
        </div>
      </div>
      <div className="rounded-xl bg-muted p-3">
        <dl className="grid grid-cols-1 gap-y-2 text-[12px] sm:grid-cols-2 sm:gap-x-6">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-semibold text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          className="text-destructive"
          onClick={resetOsVps}
        >
          Reset Topside
        </Button>
      </div>
    </Section>
  );
}
