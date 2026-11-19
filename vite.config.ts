import { defineConfig } from "vitest/config";

// Pages serves a project under /<repo>/. Local dev uses /.
const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;

export default defineConfig({
  base: env?.VITE_BASE || "/",
  build: {
    target: "es2022",
    assetsInlineLimit: 0,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
