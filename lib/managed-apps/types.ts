export const MANAGED_APP_IDS = ["hermes", "openclaw"] as const;
export type ManagedAppId = (typeof MANAGED_APP_IDS)[number];

export const MANAGED_APP_ACTIONS = ["start", "stop", "restart", "backup"] as const;
export type ManagedAppAction = (typeof MANAGED_APP_ACTIONS)[number];

export type ManagedAppState =
  | "not-installed"
  | "stopped"
  | "starting"
  | "running"
  | "unhealthy"
  | "error";

export interface ManagedAppDefinition {
  id: ManagedAppId;
  name: string;
  description: string;
  command: string;
  serviceNames: readonly string[];
  containerNames: readonly string[];
  dashboardUrl: string;
  stateDirName: string;
  gradient: string;
}

export interface ManagedAppView {
  id: ManagedAppId;
  name: string;
  description: string;
  installed: boolean;
  installationType: "systemd" | "docker" | "package" | "not-installed";
  state: ManagedAppState;
  healthy: boolean | null;
  version: string | null;
  dashboardAvailable: boolean;
  supportedActions: ManagedAppAction[];
}

export interface ManagedAppLogs {
  available: boolean;
  entries: string[];
}
