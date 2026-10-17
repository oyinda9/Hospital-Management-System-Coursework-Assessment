import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  workers: 1,
  use: { headless: true, screenshot: "on", trace: "retain-on-failure" },
  webServer: [
    {
      command: "node ../Backend/scripts/e2eServer.js",
      url: "http://localhost:4000/api/v1/user/doctors",
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: "npm run dev -- --port 5173 --strictPort",
      cwd: "../Frontend-Admin",
      url: "http://localhost:5173",
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: "npm run dev -- --port 5174 --strictPort",
      cwd: "../Frontend-Patient",
      url: "http://localhost:5174",
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
});