// os-shell — the os-vps ("Topside") consumer of the generic AppShell framework.
//
// The shell runtime, registries, responsive provider, chrome and primitives now
// live in the brand-free `appshell` slice (lift-ready for rr). This barrel stays
// the STABLE public surface every app slice imports from (`@/features/os-shell`),
// re-exporting appshell verbatim so app slices need no edits. os-vps-specific
// wiring (brand + apps + features) lives in `./shell.manifest.ts` (added in a
// later phase) and is passed to <AppShell manifest=…>.
export * from "@/features/appshell";
// Bridge os-vps-specific host helpers (raw-bytes URL + byte/uptime formatters)
// into the stable barrel so app slices reach them via @/features/os-shell (a
// legal peer alias) rather than @/lib/os-api directly. The OsApi port + hook
// already flow through the appshell re-export above.
export { rawUrl, zipUrl } from "@/lib/os-api";
export * from "@/lib/os-api/format";
export {
  TOPSIDE_BRAND,
  TOPSIDE_FEATURES,
  TOPSIDE_PERSIST_KEY,
  BUILTIN_APPS,
} from "./shell.manifest";
export { topsideCapabilities } from "./capabilities";
export { A11yCommands } from "./a11y-commands";
// Dashboard shell now lives in the brand-free framework (appshell) and is
// surfaced by the `export * from "@/features/appshell"` above (it self-registers
// on import there). App slices that referenced DashboardShell via
// @/features/os-shell keep working unchanged.
// Built-in live wallpapers (Drift / Starfield) — register into the appshell
// wallpaper registry on import; Settings lists them via useWallpapers().
import "./live-wallpapers";
