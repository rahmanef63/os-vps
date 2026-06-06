"use client";

import { Activity } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePublishInspector, useOsApi } from "./lib/host";
import { AppFrame } from "./components/host-frame";
import { GaugeGrid } from "./components/gauge-grid";
import { GlassPanel } from "./components/glass-panel";
import { Sparkline } from "./components/sparkline";
import { ProcessTable } from "./components/process-table";
import { useStatsHistory } from "./lib/use-stats-history";
import { MONITOR_VARS, type MonitorVar } from "./lib/palette";
import { fmtGiBPair, fmtMBs, fmtPct } from "./lib/format";

// Default export so os-shell can lazy-load it as a window app.
export default function SystemMonitor() {
  const api = useOsApi();
  const { stats, procs, cpuSeries, netSeries, gpu, refresh } = useStatsHistory();

  usePublishInspector(
    "system-monitor",
    {
      subject: "VPS host",
      props: [
        { label: "CPU", value: stats ? fmtPct(stats.cpu.pct) : "—" },
        { label: "Memory", value: stats ? fmtGiBPair(stats.mem.used, stats.mem.total) : "—" },
        { label: "Disk", value: stats ? fmtGiBPair(stats.disk.used, stats.disk.total) : "—" },
        { label: "Processes", value: String(procs.length) },
        { label: "Mode", value: api.mode },
      ],
      actions: [{ id: "refresh", label: "Refresh", run: refresh }],
      context: stats
        ? `System monitor: cpu ${fmtPct(stats.cpu.pct)}, mem ${fmtGiBPair(stats.mem.used, stats.mem.total)} (${api.mode})`
        : "System monitor: reading host telemetry…",
      suggestions: ["Why is CPU high?", "What's using memory?", "Recommend cleanup"],
    },
    [stats, procs.length, api.mode, refresh],
  );

  if (!stats) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-[color:var(--text-faint)]">
        Reading host telemetry…
      </div>
    );
  }

  const lastNet = netSeries[netSeries.length - 1] ?? 0;

  return (
    <AppFrame>
      <ScrollArea className="h-full">
      <div
        className="space-y-3.5 p-4"
        style={MONITOR_VARS as React.CSSProperties}
      >
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">System Monitor</h2>
          </div>
          <span className="rounded-full bg-[color:var(--inset)] px-2 py-0.5 font-mono text-[10px] text-[color:var(--text-dim)]">
            {stats.cpu.cores} cores · {api.mode}
          </span>
        </header>

        <GaugeGrid stats={stats} gpu={gpu} />

        <div className="grid grid-cols-2 gap-3 @max-[440px]:grid-cols-1">
          <GlassPanel title="CPU load" right={fmtPct(stats.cpu.pct)}>
            <Sparkline data={cpuSeries} accent={"--mon-cpu" as MonitorVar} max={100} />
          </GlassPanel>
          <GlassPanel title="Network" right={fmtMBs(lastNet)}>
            <Sparkline data={netSeries} accent={"--mon-net" as MonitorVar} />
          </GlassPanel>
        </div>

        <GlassPanel title="Processes">
          <ProcessTable processes={procs} />
        </GlassPanel>
      </div>
      </ScrollArea>
    </AppFrame>
  );
}
