import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testDir: "./tests/notifications",
  outputDir: "./test-results/notifications",
  webServer: [
    { command: "npm run dev", url: "http://127.0.0.1:3100/api/health", reuseExistingServer: !process.env.CI, timeout: 90000,
      env: { NEXT_PUBLIC_SPACEOS_NOTIFICATIONS_ORIGIN: "http://127.0.0.1:3300" } },
    { command: "npm --prefix apps/notifications run dev", url: "http://127.0.0.1:3300", reuseExistingServer: !process.env.CI,
      env: { SPACEOS_PARENT_ORIGIN: "http://127.0.0.1:3100" } },
  ],
});
