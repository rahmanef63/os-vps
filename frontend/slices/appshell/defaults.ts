// Bundled system features + the default feature set — split from index.ts to
// keep the barrel under the 200-line gate. Everything here re-exports through
// the barrel (`export * from "./defaults"`).
// ── Bundled shell features ───────────────────────────────────────────────────
// Each is a defineFeature() contribution mounted via `manifest.features`. They
// live inside this slice (appshell/features/*) so the whole shell installs as
// one unit. Re-exported LAST (from index.ts) so the core bindings they read are
// already live.
import { searchFeature } from "./features/search";
import { inspectorFeature } from "./features/inspector";
import { notificationsFeature } from "./features/notifications";
import { controlCenterFeature } from "./features/control-center";
import { widgetsFeature } from "./features/widgets";
import { quickLookFeature } from "./features/quick-look";
import { clipboardFeature } from "./features/clipboard";
import { shareFeature } from "./features/share";
import { shortcutHelpFeature } from "./features/shortcut-help";
import { lockScreenFeature } from "./features/lock-screen";

export { searchFeature } from "./features/search";
export { inspectorFeature } from "./features/inspector";
export { notificationsFeature } from "./features/notifications";
export { controlCenterFeature } from "./features/control-center";
export { widgetsFeature } from "./features/widgets";
export { quickLookFeature } from "./features/quick-look";
export { clipboardFeature } from "./features/clipboard";
export { shareFeature } from "./features/share";
export { shortcutHelpFeature } from "./features/shortcut-help";
export { lockScreenFeature } from "./features/lock-screen";

// The default system-feature set — generic, brand-free, app-agnostic. Drop the
// whole bundle into any consumer's manifest in one line (`features:
// DEFAULT_FEATURES`). Spread + override/trim per project; each entry is
// independently removable since the surfaces are slot-driven (a feature absent
// from the array just doesn't mount).
export const DEFAULT_FEATURES = [
  searchFeature,
  quickLookFeature,
  clipboardFeature,
  shareFeature,
  shortcutHelpFeature,
  lockScreenFeature,
  inspectorFeature,
  notificationsFeature,
  controlCenterFeature,
  widgetsFeature,
];
