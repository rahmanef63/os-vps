// Reusable glass card with a title row + optional right-aligned readout.
// Theme-token surfaces only (rr: no hex).
export function GlassPanel({
  title,
  right,
  children,
}: {
  title: string;
  right?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--sep)] bg-[color:var(--glass-panel)] px-3.5 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12.5px] font-bold text-foreground">{title}</span>
        {right ? (
          <span className="font-mono text-xs text-[color:var(--text-dim)]">
            {right}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
