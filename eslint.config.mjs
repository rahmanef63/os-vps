// ESLint 9 flat config (Next 16 removed `next lint`; eslint-config-next v16
// exports flat arrays). core-web-vitals = next + react + react-hooks presets —
// exhaustive-deps polices the effect-dep discipline the shell relies on.
import next from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "mock-os/**", // inert design prototype, not app code
      "os-browser/**", // separate sidecar package (plain Node)
      "public/**",
      "next-env.d.ts",
    ],
  },
  ...next,
  {
    // react-hooks v6 "compiler-era" rules, enforced as errors: the 2026-06-06
    // sweep converted every legacy pattern (latest-ref mirrors → effect
    // assignment, effect-driven resets → request-keyed derived state, inline
    // icon lookups → createElement, inline components → hoisted). Keep them at
    // error so the patterns don't creep back; the one sanctioned exception
    // (post-hydration restore in lib/appearance/store.tsx) carries an inline
    // disable with rationale.
    rules: {
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/refs": "error",
      "react-hooks/static-components": "error",
      "react-hooks/immutability": "error",
      "react-hooks/use-memo": "error",
    },
  },
];

export default config;
