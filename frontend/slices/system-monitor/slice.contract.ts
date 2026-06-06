/**
 * Slice contract for `system-monitor` — v0.1.0.
 * Excluded from app tsc; validated by rr tooling on lift.
 */
import { defineSliceContract } from "@/packages/cli/lib/contract";

export const contract = defineSliceContract({
  id: "system-monitor",
  version: "0.1.0",
  category: "infra",
  kind: "full",
  requires: {
    auth: "convex" as const,
    rbac: [] as string[],
    env: [] as string[],
    convex: {
      prefix: "systemMonitor_",
      tables: ["systemMonitor_snapshots"] as string[],
    },
    deps: ["os-shell", "convex-auth"] as const,
  },
  provides: {
    routes: [] as string[],
    hooks: [] as string[],
    components: ["SystemMonitor"] as string[],
    tables: ["systemMonitor_snapshots"] as string[],
  },
});

export default contract;
