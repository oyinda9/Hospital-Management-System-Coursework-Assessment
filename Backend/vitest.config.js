import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.js"],
    hookTimeout: 120000,
    include: ["**/*.test.js"],
    exclude: ["node_modules", "dist"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "controller/**",
        "middlewares/**",
        "models/**",
        "router/**",
        "utils/**",
      ],
      thresholds: {
        statements: 70,
        branches: 50,
        functions: 65,
        lines: 70,
      },
    },
  },
});
