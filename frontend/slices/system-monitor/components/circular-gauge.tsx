import type { MonitorVar } from "../lib/palette";

// Circular SVG gauge. Colour comes from a slice-scoped CSS var (theme-token
// only — no hex in markup). The arc transition is GPU-cheap (stroke-dashoffset).
export function CircularGauge({
  label,
  pct,
  sub,
  accent,
}: {
  label: string;
  pct: number; // 0..100
  sub: string;
  accent: MonitorVar;
}) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - Math.max(0, Math.min(100, pct)) / 100);
  const stroke = `var(${accent})`;
  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-[color:var(--sep)] bg-[color:var(--glass-panel)] px-4 py-3.5">
      <div className="relative size-16 shrink-0">
        <svg viewBox="0 0 64 64" className="-rotate-90">
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke="var(--inset)"
            strokeWidth="7"
          />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={off}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-[15px] font-bold tabular-nums">
          {Math.round(pct)}%
        </div>
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-bold text-foreground">{label}</div>
        <div className="mt-0.5 truncate text-[11px] text-[color:var(--text-faint)]">
          {sub}
        </div>
      </div>
    </div>
  );
}
