/**
 * Slice contract for `files-manager` — v0.1.0.
 * Excluded from app tsc; validated by rr tooling on lift.
 */
import { defineSliceContract } from "@/packages/cli/lib/contract";

export const contract = defineSliceContract({
  id: "files-manager",
  version: "0.1.0",
  category: "infra",
  kind: "full",
  requires: {
    auth: "convex" as const,
    rbac: [] as string[],
    env: [] as string[],
    deps: ["os-shell"] as const,
  },
  provides: {
    routes: [] as string[],
    hooks: [] as string[],
    components: ["FilesManager"] as string[],
    tables: [] as string[],
  },
});

export default contract;
