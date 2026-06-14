/**
 * Slice contract for `os-terminal` — v0.1.0.
 * Excluded from app tsc; validated by rr tooling on lift.
 */
import { defineSliceContract } from "@/packages/cli/lib/contract";

export const contract = defineSliceContract({
  id: "os-terminal",
  version: "0.1.0",
  category: "infra",
  kind: "full",
  requires: {
    auth: "cookie" as const,
    rbac: [] as string[],
    env: ["OS_AGENT_URL", "OS_AGENT_SECRET"] as string[],
    deps: ["os-shell"] as const,
  },
  provides: {
    routes: [] as string[],
    hooks: [] as string[],
    components: ["TerminalApp"] as string[],
    tables: [] as string[],
  },
});

export default contract;
