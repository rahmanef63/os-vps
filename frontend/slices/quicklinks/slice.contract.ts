/**
 * Slice contract for `quicklinks` — v0.1.0.
 * Excluded from app tsc; validated by rr tooling on lift.
 *
 * Website-shortcut app + shell integration. Data is the shared lib/quicklinks
 * store (localStorage); the shell consumes it via the injected useQuickLinks
 * capability so appshell stays brand/host-free.
 */
import { defineSliceContract } from "@/packages/cli/lib/contract";

export const contract = defineSliceContract({
  id: "quicklinks",
  version: "0.1.0",
  category: "ui",
  kind: "full",
  requires: {
    auth: "none" as const,
    rbac: [] as string[],
    env: [] as string[],
    deps: ["os-shell"] as const,
  },
  provides: {
    routes: [] as string[],
    hooks: ["useQuicklinks"] as string[],
    components: ["QuicklinksApp"] as string[],
    tables: [] as string[],
  },
});

export default contract;
