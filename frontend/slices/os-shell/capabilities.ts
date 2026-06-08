"use client";

import { useEffect, useState } from "react";
import { effectiveServerTarget, selectServerTarget, useAppearance } from "@/lib/appearance";
import { useOsApi } from "@/lib/os-api";
import { IS_DEMO } from "@/lib/demo";
import { streamReply } from "@/lib/ai/stream";
import { openWindow, type ShellCapabilities, type SystemStats } from "@/features/appshell";

// Adapts os-vps's appearance store + host API + AI stream to the generic AppShell
// capability contract, so `appshell` AND its feature slices carry NO dependency on
// @/lib/*. These run inside os-root's AppearanceProvider + OsApiProvider (AppShell
// is nested below them).
export const topsideCapabilities: ShellCapabilities = {
  useAppearance: () => {
    const { tweaks, setTweaks } = useAppearance();
    return {
      theme: tweaks.theme,
      setTheme: (t) => setTweaks({ theme: t }),
      device: tweaks.device,
      wallpaper: tweaks.wallpaper,
      wallpaperStyle: tweaks.wallpaperStyle,
    };
  },
  useCpuPercent: () => {
    const api = useOsApi();
    const [cpu, setCpu] = useState<number | null>(null);
    useEffect(() => {
      let alive = true;
      const poll = () => api.sys.stats().then((s) => alive && setCpu(Math.round(s.cpu.pct)));
      poll();
      const t = setInterval(poll, 4000);
      return () => {
        alive = false;
        clearInterval(t);
      };
    }, [api]);
    return cpu;
  },
  // Spotlight folder search → ready-to-run hits that open Files at the path.
  useSearch: () => {
    const api = useOsApi();
    return async (query) =>
      (await api.fs.search(query)).map((h) => ({
        id: `dir:${h.path}`,
        label: h.name,
        hint: "Folder",
        // Files is multi-instance — each folder hit opens its own window.
        run: () => openWindow("files-manager", h.name, undefined, { path: h.path }, { multi: true }),
      }));
  },
  // Today-widget telemetry — sys.stats + fs.usage, polled.
  useSystemStats: () => {
    const api = useOsApi();
    const [s, setS] = useState<SystemStats | null>(null);
    useEffect(() => {
      let alive = true;
      const poll = async () => {
        try {
          const [sys, usage] = await Promise.all([api.sys.stats(), api.fs.usage()]);
          if (alive)
            setS({
              cpu: { pct: Math.round(sys.cpu.pct), cores: sys.cpu.cores },
              mem: { used: sys.mem.used, total: sys.mem.total },
              disk: { used: usage.used, total: usage.total },
            });
        } catch {
          /* leave last value */
        }
      };
      poll();
      const t = setInterval(poll, 3000);
      return () => {
        alive = false;
        clearInterval(t);
      };
    }, [api]);
    return s;
  },
  // Scoped Alfa chat — the wire stream passes straight through.
  useChat: () => streamReply,
  // Control-center server-mode tile (mock|live; locked + relabelled in demo).
  useServerToggle: () => {
    const { tweaks, setTweaks } = useAppearance();
    const active = effectiveServerTarget(tweaks.server, IS_DEMO);
    const live = active?.kind === "local";
    return {
      live,
      label: IS_DEMO ? "Mock · demo" : active?.kind === "ssh" ? active.label : live ? "Live" : "Mock",
      locked: IS_DEMO,
      toggle: () =>
        setTweaks({
          server: selectServerTarget(tweaks.server, live ? "mock" : "vps"),
        }),
    };
  },
};
