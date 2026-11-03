import { expect, test, type Page } from "@playwright/test";
const origin = "http://127.0.0.1:3300";
const events = [
  { id: "event-one", title: "Kiểm tra cuối khóa", subject: "Tiếng Anh", startTime: "2099-11-03T02:00:00.000Z" },
  { id: "event-two", title: "Họp chuyên môn", subject: "Giáo viên", startTime: "2020-11-03T02:00:00.000Z" },
];
async function fixture(page: Page) {
  await page.route(`${origin}/api/notifications`, route => route.fulfill({ json: { events, observedAt: new Date().toISOString() } }));
  await page.route(`${origin}/api/status`, route => route.fulfill({ json: { status: "ready", count: events.length, observedAt: new Date().toISOString() } }));
}
test("standalone distinguishes disconnected, forbidden, empty and source failures", async ({ page }) => {
  await page.goto(origin); await page.getByRole("button", { name: "Chuyển sang tiếng Việt" }).click();
  await expect(page.getByRole("heading", { name: "Kết nối để xem cập nhật" })).toBeVisible();
  for (const [status, json, heading] of [
    [403, { code: "NOTIFICATIONS_FORBIDDEN" }, "Bạn chưa có quyền xem nguồn này"],
    [401, { code: "NOTIFICATIONS_UNAUTHENTICATED" }, "Cần đăng nhập GeeO"],
    [503, { code: "NOTIFICATIONS_UNAVAILABLE" }, "Chưa tải được cập nhật"],
    [200, { events: [], observedAt: new Date().toISOString() }, "Chưa có sự kiện"],
  ] as const) {
    await page.route(`${origin}/api/notifications`, route => route.fulfill({ status, json }));
    await page.getByRole("button", { name: "Làm mới", exact: true }).click();
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
});
test("search, period, grouping and details work with source data without claiming read state", async ({ page }) => {
  await fixture(page); await page.goto(origin);
  await page.getByRole("button", { name: "Chuyển sang tiếng Việt" }).click();
  await expect(page.locator(".event-card")).toHaveCount(2);
  await page.getByRole("searchbox").fill("kiem tieng"); await expect(page.locator(".event-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Đã diễn ra", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Không tìm thấy sự kiện phù hợp" })).toBeVisible();
  await page.getByRole("button", { name: "Xóa bộ lọc" }).click();
  await page.locator(".event-card").first().click();
  await expect(page.getByRole("dialog")).toContainText("Mở chi tiết không đánh dấu đã đọc");
  await page.getByRole("button", { name: "Đóng chi tiết", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.locator(".event-card").first().click();
  await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByRole("button", { name: "Tùy chọn hiển thị", exact: true }).click();
  await page.getByLabel("Nhóm theo chủ đề", { exact: false }).uncheck();
  await page.reload(); await page.getByRole("button", { name: "Chuyển sang tiếng Việt" }).click();
  await expect(page.locator(".event-group h3")).toHaveCount(0);
  for (const width of [320, 375, 640, 641, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
test("embedded app inherits context, preserves filters, and toolbar works independently of its window", async ({ page, isMobile }) => {
  await fixture(page); await page.goto("/notifications");
  const app = page.frameLocator('[data-app="notifications"] iframe');
  await expect(app.locator("html")).toHaveAttribute("data-presentation", "embedded");
  await expect(app.locator(".space-app-identity")).toBeHidden();
  await expect(app.locator(".event-card")).toHaveCount(2);
  await app.getByRole("searchbox").fill("kiem");
  const bell = page.getByRole("button", { name: "Xem nhanh thông báo: 2 sự kiện" }); await bell.click();
  const quick = page.getByRole("dialog", { name: "Xem nhanh thông báo" });
  await expect(quick).toContainText("Đây không phải số thông báo chưa đọc");
  await quick.getByLabel("Hiện thông tin ngắn trên thanh đầu").check();
  await page.keyboard.press("Escape"); await expect(quick).toBeHidden(); await expect(bell).toBeFocused();
  if (!isMobile) {
    await page.locator('[data-app="notifications"]').getByRole("button", { name: /Thu nhỏ/ }).click();
    await expect(page.locator('[data-app="notifications"]')).toBeHidden();
    await bell.click(); await quick.getByRole("button", { name: "Mở Thông báo", exact: true }).click();
    await expect(app.getByRole("searchbox")).toHaveValue("kiem");
  }
  const utility = page.getByRole("button", { name: "Tiện ích", exact: true }); if (await utility.isVisible()) await utility.click();
  await page.getByRole("button", { name: "Đổi ngôn ngữ sang tiếng Anh" }).click();
  await expect(app.locator("html")).toHaveAttribute("lang", "en");
  await expect(app.getByRole("searchbox")).toHaveValue("kiem");
  await expect(app.locator(".event-card")).toHaveCount(1);
  const dark = await page.locator(".geeospace-os").getAttribute("data-theme");
  await expect(app.locator("html")).toHaveAttribute("data-theme", dark!);
  await page.getByRole("button", { name: dark === "dark" ? "Switch to light mode" : "Switch to dark mode" }).click();
  await expect(app.locator("html")).toHaveAttribute("data-theme", dark === "dark" ? "light" : "dark");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(app.locator("html")).toHaveAttribute("data-reduced-motion", "true");
});
test("status ignores wrong windows, expires on silence, and clears counts on lost access", async ({ page }) => {
  await page.clock.install();
  await fixture(page); await page.goto("/notifications");
  const bell = page.locator(".os-app-status-trigger");
  await expect(bell).toHaveAttribute("aria-label", "Xem nhanh thông báo: 2 sự kiện");
  await page.evaluate(() => window.postMessage({ type: "spaceos:app-status", version: 1, appId: "notifications", status: "ready", count: 99 }, location.origin));
  await expect(bell).toHaveAttribute("aria-label", "Xem nhanh thông báo: 2 sự kiện");
  await page.route(`${origin}/api/status`, route => route.fulfill({ status: 401, json: { code: "NOTIFICATIONS_UNAUTHENTICATED" } }));
  // Reconnect the dedicated channel; the app window is not the status owner.
  await page.locator('.os-app-status-tray iframe').evaluate((frame: HTMLIFrameElement) => { frame.src = frame.src; });
  await expect(bell).toHaveAttribute("aria-label", "Xem nhanh thông báo: Cần đăng nhập");
  await expect(bell.locator(".os-app-status-count")).toHaveCount(0);
  await page.frame({ url: `${origin}/status` })!.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));
  await page.clock.fastForward(180_000);
  await expect(bell).toHaveAttribute("aria-label", "Xem nhanh thông báo: Cần cập nhật lại");
});
