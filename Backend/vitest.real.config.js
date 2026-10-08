// Same settings as the normal config, but switches setup.js into real-database mode.
import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config.js";

export default mergeConfig(
  base,
  defineConfig({
    test: {
      env: { TEST_DB: "real" }, // tells setup.js to use the Atlas cluster
      testTimeout: 60000,       // network calls are slower
    },
  })
);