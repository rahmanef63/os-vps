# Changelog

## 2026-06-14 — Audit loop T2→T8 (8 ticks)

Eight-tick cleanup over `AUDIT-2026-06-11.md`. Gates green at every tick
(typecheck · lint · vitest).

- **T2 a11y + tests** (`cf0ed9f`) Pinch-zoom restored, menus roled,
  icon-buttons labeled. +19 tests → 201 total.
- **T3 UX error doctrine** (`d11b997`) Shared toast bus across former
  zero-adopters (5 sites). `window.confirm` + naked destructive ops →
  `ResponsiveDialog` + undo. 7 regimes → 1.
- **T4 focused hotkey + hygiene** (`b1ea15e`) `useFocusedHotkey()` primitive.
  8 stale Convex-era `slice.json` cleaned. Radix imports scoped per-app.
- **T5 WindowPreview + agent scope** (`093759b`) Generic `<WindowPreview>`
  primitive kills mobile-switcher double-PTY. `OS_AGENT_TOKEN` scoped to
  `/api/v1/browser/*`.
- **T6 perf + mobile** (`3772ff8`) Reel frame-store (~6× re-render drop).
  Image-editor Blob history (3–5× mem drop). 3 apps on `MasterDetail`/`AppFrame`.
- **T7 HMAC + HSTS** (`b1255ee`) `constantTimeEq` length-leak closed. HSTS
  doc in `INSTALL.md`. +23 tests → 244 total.
- **T8 virt + queue + tokenize** (`3af3b3b`) Files list virtualized (~25–40×
  DOM drop). `lib/host/audit` serializes writes through chained promise.
  Code-editor incremental tokenize. Smoke-test scaffold.
