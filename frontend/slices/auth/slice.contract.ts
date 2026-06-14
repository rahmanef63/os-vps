/**
 * Slice contract for `auth` — v0.1.0.
 * Excluded from app tsc; validated by rr tooling on lift.
 */
import { defineSliceContract } from "@/packages/cli/lib/contract";

export const contract = defineSliceContract({
  id: "auth",
  version: "0.1.0",
  category: "auth",
  kind: "full",
  requires: {
    auth: "cookie" as const,
    rbac: [] as string[],
    env: [] as string[],
    deps: [] as const,
  },
  provides: {
    routes: [] as string[],
    hooks: [] as string[],
    components: ["AuthGate", "LoginScreen"] as string[],
    tables: [] as string[],
  },
});

export default contract;
