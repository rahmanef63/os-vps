// Telemetry formatters — now shared at the os-api contract layer so About,
// neofetch and the monitor all show the same numbers. Re-exported here to keep
// the slice's internal import paths stable.
export {
  fmtGiB,
  toGiB,
  fmtGiBPair,
  fmtPct,
  fmtMBs,
  clampPct,
  fmtUptime,
} from "@/lib/os-api/format";
