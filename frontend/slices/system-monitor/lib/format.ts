// Telemetry formatters — theme-agnostic display helpers (rr: no hex, no I/O).
const GiB = 1024 ** 3;

export function fmtGiB(bytes: number): string {
  return (bytes / GiB).toFixed(1) + " GB";
}

export function toGiB(bytes: number): number {
  return bytes / GiB;
}

export function fmtGiBPair(used: number, total: number): string {
  return `${(used / GiB).toFixed(1)} / ${(total / GiB).toFixed(0)} GB`;
}

export function fmtPct(n: number): string {
  return Math.round(n) + "%";
}

// Net throughput already arrives as MB/s from the contract; clamp for display.
export function fmtMBs(n: number): string {
  return n.toFixed(1) + " MB/s";
}

// Keep a value inside a visible 0..100 band so gauges never collapse/overflow.
export function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n));
}
