/**
 * Slice contract for `os-settings` — v0.1.0.
 * Excluded from app tsc; validated by rr tooling on lift.
 */
import { defineSliceContract } from "@/packages/cli/lib/contract";

export const contract = defineSliceContract({
  id: "os-settings",
  version: "0.1.0",
  category: "ui",
  kind: "full",
  requires: {
    auth: "cookie" as const,
    rbac: [] as string[],
    env: [] as string[],
    deps: ["os-shell"] as const,
  },
  provides: {
    routes: [] as string[],
    hooks: [] as string[],
    components: ["OsSettings"] as string[],
    tables: [] as string[],
  },
});

export default contract;
