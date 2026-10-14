// Configuration file for vitest, the test runner used in this project.
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
      // Measure only the application code, not the tests, scripts or config.
      include: [
        "controller/**",
        "middlewares/**",
        "models/**",
        "router/**",
        "utils/**",
      ], // Quality gate: this makes sure that the  run fails if coverage drops below these measured-level floors.
      thresholds: {
        statements: 99,
        branches: 50,
        functions: 65,
        lines: 70,
      },
    },
    
  },
});
