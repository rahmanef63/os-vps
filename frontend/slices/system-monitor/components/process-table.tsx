import { Fragment } from "react";
import type { Process } from "../lib/host";
import { cn } from "@/lib/utils";

const COLS = "grid grid-cols-[3rem_1fr_5rem_4rem_4.5rem] gap-2";

// Live agent returns [] (no host process bridge yet) → placeholder. Mock mode
// returns seeded rows. mem arrives in MB per the adapter; render as-is.
export function ProcessTable({ processes }: { processes: Process[] }) {
  if (processes.length === 0) {
    return (
      <p className="py-2 text-center text-[11px] text-[color:var(--text-faint)]">
        No process data from host
      </p>
    );
  }
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
      {processes.map((p, i) => (
        <Fragment key={p.pid}>
          <div
            className={cn(
              COLS,
              "items-center px-1 py-1.5 text-[12.5px]",
              i > 0 && "border-t border-[color:var(--sep)]",
            )}
          >
            <span className="font-mono tabular-nums text-[color:var(--text-dim)]">
              {p.pid}
            </span>
            <span className="truncate font-mono text-xs font-medium text-foreground">
              {p.name}
            </span>
            <span className="text-right">
              <span className="rounded-full bg-[color:var(--inset)] px-1.5 py-0.5 text-[11px] font-medium text-[color:var(--text-dim)]">
                {p.status}
              </span>
            </span>
            <span
              className={cn(
                "text-right font-mono tabular-nums",
                p.cpu > 50
                  ? "text-destructive"
                  : "text-[color:var(--text-dim)]",
              )}
            >
              {p.cpu.toFixed(0)}%
            </span>
            <span className="text-right font-mono tabular-nums text-[color:var(--text-dim)]">
              {p.mem.toFixed(0)}M
            </span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
