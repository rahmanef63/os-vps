/**
 * Slice contract for `assistant` — v0.1.0.
 * Excluded from app tsc; validated by rr tooling on lift.
 */
import { defineSliceContract } from "@/packages/cli/lib/contract";

export const contract = defineSliceContract({
  id: "assistant",
  version: "0.1.0",
  category: "ai",
  kind: "full",
  requires: {
    auth: "none" as const,
    rbac: [] as string[],
    env: [] as string[],
    deps: ["os-shell"] as const,
  },
  provides: {
    routes: [] as string[],
    hooks: [] as string[],
    components: ["Assistant"] as string[],
    tables: [] as string[],
  },
});

export default contract;
