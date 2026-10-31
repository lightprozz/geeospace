import { expect, test } from "@playwright/test";

test("platform-smoke-worker: SSR and safe auth boundary on Workers", async ({ request, page }) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({ status: "ok", service: "geeospace", capabilities: { database: true, privateFiles: true } });
  const auth = await request.get("/api/auth/login");
  expect(auth.status()).toBe(503);
  expect(auth.headers()["cache-control"]).toContain("no-store");
  const response = await page.goto("/today");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Bắt đầu một ngày rõ ràng." })).toBeVisible();
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");
});
