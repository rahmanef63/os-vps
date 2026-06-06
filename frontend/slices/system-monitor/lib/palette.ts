// Per-gauge accent palette. rr forbids raw hex in markup, so the hues live in
// one place as CSS custom properties and are consumed via var(--mon-*) — the
// slice root injects them (see app.tsx `style`), children only reference tokens.
export const MONITOR_VARS = {
  "--mon-cpu": "color-mix(in oklab, var(--accent) 92%, cyan)",
  "--mon-mem": "color-mix(in oklab, var(--accent) 55%, magenta)",
  "--mon-disk": "color-mix(in oklab, orange 80%, var(--accent))",
  "--mon-gpu": "color-mix(in oklab, var(--destructive) 70%, magenta)",
  "--mon-net": "color-mix(in oklab, var(--accent) 30%, lime)",
} as const satisfies Record<string, string>;

export type MonitorVar = keyof typeof MONITOR_VARS;
