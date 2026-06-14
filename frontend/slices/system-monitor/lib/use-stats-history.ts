"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useOsApi, type SysStats, type Process } from "./host";
import { clampPct } from "./format";

const SPAN = 40; // rolling history points
const POLL_MS = 1500;

export type StatsHistory = {
  stats: SysStats | null;
  procs: Process[];
  cpuSeries: number[]; // % 0..100
  netSeries: number[]; // MB/s (rx + tx)
  gpu: number; // mock 0..100
  /** Last poll error message — null while healthy. The UI surfaces this as a
   *  retry tile instead of an eternal spinner. */
  error: string | null;
  refresh: () => void; // manual one-shot re-poll
};

// Polls sys.stats on an interval, accumulating a ~40-point rolling history for
// the CPU + network sparklines, plus a local GPU mock walk (GPU isn't in the
// contract). Refs avoid re-subscribing the interval on every tick.
export function useStatsHistory(): StatsHistory {
  const api = useOsApi();
  const [stats, setStats] = useState<SysStats | null>(null);
  const [procs, setProcs] = useState<Process[]>([]);
  const [cpuSeries, setCpu] = useState<number[]>(() => Array(SPAN).fill(0));
  const [netSeries, setNet] = useState<number[]>(() => Array(SPAN).fill(0));
  const [gpu, setGpu] = useState(18);
  const [error, setError] = useState<string | null>(null);
  const gpuRef = useRef(18);
  const aliveRef = useRef(true);

  // One sample of stats + processes. Guarded so an unmount mid-flight no-ops.
  // Failures land on `.catch` so an interval-driven failure doesn't pollute the
  // console with unhandled-rejection lines every POLL_MS ms.
  const pull = useCallback(() => {
    api.sys
      .stats()
      .then((s) => {
        if (!aliveRef.current) return;
        setStats(s);
        setError(null);
        setCpu((a) => [...a.slice(1), clampPct(s.cpu.pct)]);
        const net = s.net ? s.net.rx + s.net.tx : 0;
        setNet((a) => [...a.slice(1), Math.max(0, net)]);
        gpuRef.current = clampPct(gpuRef.current + (Math.random() - 0.5) * 24);
        setGpu(gpuRef.current);
        api.sys
          .processes()
          .then((p) => aliveRef.current && setProcs(p))
          .catch(() => {});
      })
      .catch((e) => {
        if (!aliveRef.current) return;
        setError(e instanceof Error ? e.message : String(e));
      });
  }, [api]);

  useEffect(() => {
    aliveRef.current = true;
    pull();
    const iv = setInterval(pull, POLL_MS);
    return () => {
      aliveRef.current = false;
      clearInterval(iv);
    };
  }, [pull]);

  return { stats, procs, cpuSeries, netSeries, gpu, error, refresh: pull };
}
