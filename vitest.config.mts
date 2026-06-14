import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": root,
      "@/features": path.join(root, "frontend", "slices"),
    },
  },
  test: {
    include: [
      "app/**/*.test.{ts,tsx}",
      "frontend/slices/**/*.test.{ts,tsx}",
      "lib/**/*.test.{ts,tsx}",
      "scripts/e2e/**/*.test.{ts,tsx}",
    ],
    environment: "node",
    // Coverage configured but inert until @vitest/coverage-v8 is installed
    // (no new dep added per audit constraints). Uses Node 22's built-in V8
    // engine — `pnpm coverage` will prompt the install on first run.
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["lib/**/*.{ts,tsx}", "frontend/slices/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.d.ts",
        "**/node_modules/**",
        "**/.next/**",
        "mock-os/**",
      ],
      thresholds: {
        statements: 50,
        branches: 40,
        functions: 50,
        lines: 50,
      },
    },
  },
});
