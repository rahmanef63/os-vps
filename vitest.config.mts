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
    include: ["frontend/slices/**/*.test.{ts,tsx}", "lib/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
