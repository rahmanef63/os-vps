"use client";

import { useSyncExternalStore } from "react";
import { Cpu, HardDrive, MemoryStick } from "lucide-react";
import { useSystemStats, registerCommands, toast } from "@/features/appshell";
import { Bar, Card, Row, gb } from "./widget-cards";

// Desktop widgets — a glanceable stack pinned to the wallpaper layer (behind
// every window), macOS-Sonoma style. Opt-in via the palette ("Toggle desktop
// widgets"); preference persists.

const KEY = "sv:desktop-widgets";

let on = typeof localStorage !== "undefined" && localStorage.getItem(KEY) === "1";
const subs = new Set<() => void>();

function setOn(v: boolean) {
  on = v;
  try {
    localStorage.setItem(KEY, v ? "1" : "0");
  } catch {
    /* ignore */
  }
  subs.forEach((f) => f());
}

registerCommands("desktop-widgets", [
  {
    id: "widgets:desktop",
    label: "Toggle desktop widgets",
    hint: "Widgets",
    keywords: "glance dashboard wallpaper stats",
    run: () => {
      setOn(!on);
      toast(on ? "Desktop widgets on" : "Desktop widgets off");
    },
  },
]);

export function DesktopWidgets() {
  const enabled = useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
    () => on,
    () => on,
  );
  const s = useSystemStats();
  if (!enabled) return null;

  return (
    <div className="pointer-events-none absolute right-4 top-12 z-[5] flex w-60 flex-col gap-3">
      <Card>
        <Row icon={Cpu} label="CPU" value={s ? `${s.cpu.pct}%` : "—"} sub={s ? `${s.cpu.cores} cores` : ""} />
        <Bar pct={s?.cpu.pct ?? 0} />
      </Card>
      <Card>
        <Row icon={MemoryStick} label="Memory" value={s ? gb(s.mem.used) : "—"} sub={s ? `of ${gb(s.mem.total)}` : ""} />
        <Bar pct={s ? (s.mem.used / s.mem.total) * 100 : 0} />
      </Card>
      <Card>
        <Row icon={HardDrive} label="Storage" value={s ? gb(s.disk.used) : "—"} sub={s ? `of ${gb(s.disk.total)}` : ""} />
        <Bar pct={s ? (s.disk.used / s.disk.total) * 100 : 0} />
      </Card>
    </div>
  );
}
