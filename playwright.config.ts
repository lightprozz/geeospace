import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  webServer: [
    { command: "npm run dev", url: "http://127.0.0.1:3100/api/health", reuseExistingServer: !process.env.CI, timeout: 90000 },
    {
      command: "npx next dev --webpack --hostname 127.0.0.1 --port 3101",
      url: "http://127.0.0.1:3101/api/health", reuseExistingServer: !process.env.CI, timeout: 90000,
      env: { NEXT_PUBLIC_API_URL: "https://api.geeo.test", NEXT_PUBLIC_AUTH_API_URL: "https://auth.geeo.test", NEXT_PUBLIC_COOKIE_DOMAIN: "", NEXT_PUBLIC_GOOGLE_CLIENT_ID: "", GEEOSPACE_DIST_DIR: ".next/auth" },
    },
  ],
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
    { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } }
  ]
});
