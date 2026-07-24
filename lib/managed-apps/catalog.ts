import type { ManagedAppDefinition, ManagedAppId } from "./types";

const definitions = {
  hermes: {
    id: "hermes",
    name: "Hermes",
    description: "Hermes Agent runtime and dashboard",
    command: "hermes",
    serviceNames: ["hermes-dashboard.service", "hermes.service"],
    containerNames: ["hermes", "hermes-dashboard"],
    dashboardUrl: process.env.HERMES_DASHBOARD_URL ?? "http://127.0.0.1:9119",
    stateDirName: ".hermes",
    gradient: "linear-gradient(160deg,#8b5cf6,#4f46e5)",
  },
  openclaw: {
    id: "openclaw",
    name: "OpenClaw",
    description: "OpenClaw runtime and control surface",
    command: "openclaw",
    serviceNames: ["openclaw.service", "openclaw-gateway.service"],
    containerNames: ["openclaw", "openclaw-gateway"],
    dashboardUrl: process.env.OPENCLAW_DASHBOARD_URL ?? "http://127.0.0.1:18789",
    stateDirName: ".openclaw",
    gradient: "linear-gradient(160deg,#f97316,#dc2626)",
  },
} as const satisfies Record<ManagedAppId, ManagedAppDefinition>;

export function isManagedAppId(value: string): value is ManagedAppId {
  return value === "hermes" || value === "openclaw";
}

export function getManagedAppDefinition(id: ManagedAppId): ManagedAppDefinition {
  return definitions[id];
}

export function listManagedAppDefinitions(): ManagedAppDefinition[] {
  return [definitions.hermes, definitions.openclaw];
}
