import type { MonitorVar } from "../lib/palette";

// Pure-SVG sparkline. Stretches to fill its card via preserveAspectRatio="none"
// + non-scaling-stroke; colour from a slice-scoped CSS var (no hex in markup).
export function Sparkline({
  data,
  accent,
  max,
}: {
  data: number[];
  accent: MonitorVar;
  max?: number; // fixed scale; defaults to data peak
}) {
  const W = 300;
  const H = 54;
  const peak = Math.max(max ?? 0, ...data, 1);
  const pts = data
    .map((d, i) => `${(i / (data.length - 1)) * W},${H - (d / peak) * H}`)
    .join(" ");
  const stroke = `var(${accent})`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-[54px] w-full"
    >
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill={stroke} opacity={0.14} />
      <polyline
        points={pts}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
