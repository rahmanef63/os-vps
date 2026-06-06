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
    // react-hooks v6 "compiler-era" strictness: these flag long-standing,
    // documented patterns here (hydrate-from-localStorage setState, stable-ref
    // mirrors, render-scoped grouping vars). Advisory until a dedicated sweep —
    // keep them visible as warnings, never silent.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/use-memo": "warn",
    },
  },
];

export default config;
