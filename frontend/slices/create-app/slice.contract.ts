/**
 * Slice contract for `create-app` — v0.1.0.
 * Excluded from app tsc; validated by rr tooling on lift.
 */
import { defineSliceContract } from "@/packages/cli/lib/contract";

export const contract = defineSliceContract({
  id: "create-app",
  version: "0.1.0",
  category: "ui",
  kind: "frontend",
  requires: {
    auth: "none" as const,
    rbac: [] as string[],
    env: [] as string[],
    deps: ["os-shell", "app-store"] as const,
  },
  provides: {
    routes: [] as string[],
    hooks: [] as string[],
    components: ["CreateApp"] as string[],
    tables: [] as string[],
  },
});

export default contract;
