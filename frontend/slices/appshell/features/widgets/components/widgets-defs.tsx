"use client";

import { useEffect, useState } from "react";
import { Clock as ClockIcon, Cpu, HardDrive, MemoryStick } from "lucide-react";
import { useSystemStats } from "@/features/appshell";
import { Bar, Card, Row, gb } from "./widget-cards";

// Individual desktop-widget render components, keyed by id. Glanceable + non-
// interactive (the desktop stack is pointer-events-none, behind windows). Each
// reuses the shared Card/Row/Bar primitives. System widgets read the real host
// telemetry capability — the whole point of VPS-native widgets.

function CpuWidget() {
  const s = useSystemStats();
  return (
    <Card>
      <Row icon={Cpu} label="CPU" value={s ? `${s.cpu.pct}%` : "—"} sub={s ? `${s.cpu.cores} cores` : ""} />
      <Bar pct={s?.cpu.pct ?? 0} />
    </Card>
  );
}

function MemWidget() {
  const s = useSystemStats();
  return (
    <Card>
      <Row icon={MemoryStick} label="Memory" value={s ? gb(s.mem.used) : "—"} sub={s ? `of ${gb(s.mem.total)}` : ""} />
      <Bar pct={s ? (s.mem.used / s.mem.total) * 100 : 0} />
    </Card>
  );
}

function DiskWidget() {
  const s = useSystemStats();
  return (
    <Card>
      <Row icon={HardDrive} label="Storage" value={s ? gb(s.disk.used) : "—"} sub={s ? `of ${gb(s.disk.total)}` : ""} />
      <Bar pct={s ? (s.disk.used / s.disk.total) * 100 : 0} />
    </Card>
  );
}

function ClockWidget() {
  // The desktop stack renders client-only (its parent returns null on the
  // server), so ClockWidget never SSRs — a lazy-init `new Date()` is safe (no
  // hydration mismatch) and keeps the effect free of a synchronous setState.
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  return (
    <Card>
      <Row icon={ClockIcon} label="Clock" value={time} sub={date} />
    </Card>
  );
}

export const WIDGET_RENDER: Record<string, () => React.ReactNode> = {
  cpu: CpuWidget,
  mem: MemWidget,
  disk: DiskWidget,
  clock: ClockWidget,
};
