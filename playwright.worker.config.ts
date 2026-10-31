import { defineConfig } from "@playwright/test";
import browserSmoke from "./playwright.config";
export default defineConfig({
  testDir: "./tests",
  testMatch: ["e2e/*.spec.ts", "worker/*.spec.ts"],
  outputDir: "./test-results/worker",
  workers: 1,
  reporter: "list",
  projects: browserSmoke.projects,
  use: { baseURL: "http://127.0.0.1:8787", trace: "retain-on-failure" },
  webServer: { command: "npm run cf:preview", url: "http://127.0.0.1:8787/api/health", reuseExistingServer: false, timeout: 90000 }
});
