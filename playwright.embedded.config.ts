import { defineConfig } from "@playwright/test";
import notifications from "./playwright.notifications.config";
export default defineConfig({
  ...notifications,
  testDir: "./tests/embedded",
  outputDir: "./test-results/embedded",
  webServer: [
    { command: "npm run dev", url: "http://127.0.0.1:3100/api/health", reuseExistingServer: !process.env.CI, timeout: 90000,
      env: { NEXT_PUBLIC_SPACEOS_NOTIFICATIONS_ORIGIN: "http://127.0.0.1:3300", NEXT_PUBLIC_SPACEOS_CALENDAR_ORIGIN: "http://127.0.0.1:3200" } },
    { command: "npm --prefix apps/notifications run dev", url: "http://127.0.0.1:3300", reuseExistingServer: !process.env.CI, timeout: 90000,
      env: { SPACEOS_PARENT_ORIGIN: "http://127.0.0.1:3100" } },
    { command: "npm --prefix apps/calendar run dev", url: "http://127.0.0.1:3200", reuseExistingServer: !process.env.CI, timeout: 90000,
      env: { SPACEOS_PARENT_ORIGIN: "http://127.0.0.1:3100", GEEO_CALENDAR_MVP_ACCESS_TOKEN: "" } },
  ],
});
