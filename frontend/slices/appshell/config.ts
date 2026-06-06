// Slice config export (rr: frontend.configExport = "appshellConfig"). The shell
// declares no apps of its own — the consumer injects them via the manifest.
import type { AppDescriptor } from "./lib/types";

export type AppShellConfig = {
  /** Apps mounted into the desktop. Wired by the consumer's manifest. */
  apps: AppDescriptor[];
  /** Optional wallpaper class override (theme token based). */
  wallpaperClassName?: string;
};

export const appshellConfig: AppShellConfig = {
  apps: [],
};

export default appshellConfig;
