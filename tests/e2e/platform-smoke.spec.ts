import { expect, test } from "@playwright/test";

test("platform-smoke: honest unconfigured shell and safe navigation", async ({ page, request }) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();
  expect(await health.json()).toMatchObject({ service: "geeospace" });
  await page.goto("/today");
  await expect(page.getByRole("heading", { name: "Bắt đầu một ngày rõ ràng." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sắp tới", exact: true })).toBeVisible();
  await expect(page.getByText("Chưa thể xác định bạn có việc cần xử lý hay không.", { exact: false })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Không có việc cần làm");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: test.info().outputPath("today-light.png"), fullPage: true });
  await page.getByRole("button", { name: "Xem trạng thái kết nối", exact: true }).last().click();
  await expect(page.getByRole("heading", { name: "Kết nối đăng nhập chưa được thiết lập." })).toBeVisible();
  const auth = await request.get("/api/auth/login");
  expect(auth.status()).toBe(503);
  expect((await auth.json()).code).toBe("GEEO_AUTH_NOT_READY");
  expect(auth.headers()["cache-control"]).toContain("no-store");
});

test("platform-smoke: private data is absent and unknown routes stay 404", async ({ page, request }) => {
  await page.goto("/work");
  await expect(page.getByRole("heading", { name: "Công & lương", exact: true }).first()).toBeVisible();
  expect((await request.get("/this-module-does-not-exist")).status()).toBe(404);
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.screenshot({ path: test.info().outputPath("dark-reduced-motion.png"), fullPage: true });
});
