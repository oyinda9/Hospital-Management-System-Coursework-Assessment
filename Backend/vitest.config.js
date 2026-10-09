//Configuration file for vitest , the test runner used in this project.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.js"],
    hookTimeout: 120000,
    include: ["**/*.test.js"],
    exclude: ["node_modules", "dist"],
  },
});
