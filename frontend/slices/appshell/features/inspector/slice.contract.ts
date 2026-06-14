/**
 * Slice contract for `shell-inspector` — v0.1.0.
 * Excluded from app tsc; validated by rr tooling on lift.
 */
import { defineSliceContract } from "@/packages/cli/lib/contract";

export const contract = defineSliceContract({
  id: "shell-inspector",
  version: "0.1.0",
  category: "ui",
  kind: "full",
  requires: {
    auth: "none" as const,
    rbac: [] as string[],
    env: [] as string[],
    deps: ["appshell"] as const,
  },
  provides: {
    routes: [] as string[],
    hooks: [] as string[],
    components: ["Inspector", "InspectorAI", "inspectorFeature"] as string[],
    tables: [] as string[],
  },
});

export default contract;
