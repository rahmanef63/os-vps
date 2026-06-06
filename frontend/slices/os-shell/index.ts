// os-shell — the os-vps ("Topside") consumer of the generic AppShell framework.
//
// The shell runtime, registries, responsive provider, chrome and primitives now
// live in the brand-free `appshell` slice (lift-ready for rr). This barrel stays
// the STABLE public surface every app slice imports from (`@/features/os-shell`),
// re-exporting appshell verbatim so app slices need no edits. os-vps-specific
// wiring (brand + apps + features) lives in `./shell.manifest.ts` (added in a
// later phase) and is passed to <AppShell manifest=…>.
export * from "@/features/appshell";
export {
  TOPSIDE_BRAND,
  TOPSIDE_FEATURES,
  TOPSIDE_PERSIST_KEY,
  BUILTIN_APPS,
} from "./shell.manifest";
export { topsideCapabilities } from "./capabilities";
// Topside's Dashboard shell (single-pane cockpit) — registers itself into the
// appshell shell registry on import; macOS/Windows/iOS/Android register from
// the framework itself.
import "./dashboard-shell";
export { DashboardShell } from "./dashboard-shell";
