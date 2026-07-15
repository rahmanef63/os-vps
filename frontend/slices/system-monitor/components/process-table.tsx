import type { Process } from "../lib/host";
import { TouchList } from "./host-frame";
import { cn } from "@/lib/utils";

const COLS = "grid grid-cols-[3rem_1fr_5rem_4rem_4.5rem] gap-2";

const cpuTone = (cpu: number) =>
  cpu > 50 ? "text-destructive-text" : "text-[color:var(--text-dim)]";

// Live data via /api/v1/sys/processes (`ps`, top 40); mock mode seeds rows.
// mem arrives in MB per the adapter; render as-is. Wide panes get the grid
// table, compact panes (≤440px container) get two-line cards (TouchList rows).
export function ProcessTable({ processes }: { processes: Process[] }) {
  if (processes.length === 0) {
    return (
      <p className="py-2 text-center text-[11px] text-[color:var(--text-faint)]">
        No process data from host
      </p>
    );
  }
  return (
    <>
      {/* Pane-width swap (matches app.tsx's panel grid): ≤440px = cards. */}
      <div className="@max-[440px]:hidden">
        <WideTable processes={processes} />
      </div>
      <div className="hidden @max-[440px]:block">
        <TouchList>
          {processes.map((p) => (
            <ProcessCard key={p.pid} p={p} />
          ))}
        </TouchList>
      </div>
    </>
  );
}

function WideTable({ processes }: { processes: Process[] }) {
  return (
    <div>
      <div
        className={cn(
          COLS,
          "px-1 pb-2 text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-faint)]",
        )}
      >
        <span>PID</span>
        <span>Process</span>
        <span className="text-right">Status</span>
        <span className="text-right">CPU</span>
        <span className="text-right">Mem</span>
      </div>
      {processes.map((p) => (
        <div
          key={p.pid}
          className={cn(
            COLS,
            "items-center border-t border-[color:var(--sep)] px-1 py-1.5 text-[12.5px] first:border-t-0",
          )}
        >
          <span className="font-mono tabular-nums text-[color:var(--text-dim)]">
            {p.pid}
          </span>
          <span className="truncate font-mono text-xs font-medium text-foreground">
            {p.name}
          </span>
          <span className="text-right">
            <StatusPill status={p.status} />
          </span>
          <span className={cn("text-right font-mono tabular-nums", cpuTone(p.cpu))}>
            {p.cpu.toFixed(0)}%
          </span>
          <span className="text-right font-mono tabular-nums text-[color:var(--text-dim)]">
            {p.mem.toFixed(0)}M
          </span>
        </div>
      ))}
    </div>
  );
}

// Compact card row: name + status up top, pid/cpu/mem readouts below.
function ProcessCard({ p }: { p: Process }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[color:var(--sep)] px-1 py-2 first:border-t-0">
      <div className="min-w-0">
        <p className="truncate font-mono text-xs font-medium text-foreground">
          {p.name}
        </p>
        <p className="mt-0.5 font-mono text-[11px] tabular-nums text-[color:var(--text-faint)]">
          PID {p.pid}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <StatusPill status={p.status} />
        <div className="text-right font-mono tabular-nums">
          <p className={cn("text-[12.5px]", cpuTone(p.cpu))}>
            {p.cpu.toFixed(0)}%
          </p>
          <p className="text-[11px] text-[color:var(--text-dim)]">
            {p.mem.toFixed(0)}M
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className="rounded-full bg-[color:var(--inset)] px-1.5 py-0.5 text-[11px] font-medium text-[color:var(--text-dim)]">
      {status}
    </span>
  );
}
