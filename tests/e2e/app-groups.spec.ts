import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "App grouping desktop acceptance");
  await page.goto("/");
  await expect(page.locator(".geeospace-os")).toHaveAttribute("data-ready", "true");
});

test("dock has one LMS entry and hub launches Classes with shared running state", async ({ page }) => {
  const dock = page.getByRole("navigation", { name: "Dock ứng dụng" });
  const lms = dock.getByRole("button", { name: "Gee-O LMS", exact: true });
  await expect(lms).toHaveCount(1);
  await expect(dock.locator('[data-launch-app^="lms-"]')).toHaveCount(0);
  await lms.click();
  const hub = page.locator('[data-app="lms"]');
  await expect(hub.getByRole("heading", { name: "Gee-O LMS" })).toBeVisible();
  await hub.getByRole("button", { name: "Lớp học", exact: true }).click();
  const classes = page.locator('[data-app="lms-classes"]');
  await expect(classes.getByRole("heading", { name: "Đang chuyển sang Geeospace" })).toBeVisible();
  await expect(lms).toHaveAttribute("aria-current", "true");
  await hub.getByRole("button", { name: "Đóng Gee-O LMS", exact: true }).click({ force: true });
  await expect(lms).toHaveAttribute("data-running", "true");
});

test("launcher groups, cross-group search, keyboard navigation and focus trap", async ({ page }) => {
  await page.locator(".os-dock").getByRole("button", { name: "Tất cả ứng dụng", exact: true }).click();
  const launcher = page.getByRole("dialog", { name: "Tất cả ứng dụng", exact: true });
  const first = await launcher.getByRole("option").nth(0).boundingBox();
  const nextRow = await launcher.getByRole("option").nth(4).boundingBox();
  expect(nextRow!.y).toBeGreaterThanOrEqual(first!.y + first!.height);
  await page.keyboard.press("Escape");
  await expect(launcher).toBeHidden();
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Tìm nhanh chức năng" });
  await expect(dialog.locator(".os-launcher-group-heading")).toHaveText(["Không gian làm việc", "Gee-O LMS"]);
  const input = dialog.getByRole("combobox");
  await input.fill("yeu cau");
  await expect(dialog.getByRole("option")).toHaveCount(2);
  await expect(dialog.getByRole("option").nth(0)).toContainText("Không gian làm việc");
  await expect(dialog.getByRole("option").nth(1)).toContainText("Gee-O LMS");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-app="lms-requests"]')).toBeVisible();
  await page.keyboard.press("Control+k");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Đóng tìm kiếm" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("combobox")).toBeFocused();
  for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-app="lms-curriculum"]')).toBeVisible();
});

test("deep links, navigate, back and hashchange keep the window path", async ({ page }) => {
  await page.goto("/#lms-classes/123");
  const classes = page.locator('[data-app="lms-classes"]');
  await expect(classes.locator("[data-window-path]")).toHaveText("123");
  await classes.getByRole("button", { name: "Tổng quan mẫu" }).click();
  await expect(page).toHaveURL(/#lms-classes\/123\/overview$/);
  await classes.getByRole("button", { name: "Quay lại", exact: true }).click();
  await expect(classes.locator("[data-window-path]")).toHaveText("123");
  await expect(classes.getByRole("button", { name: "Quay lại", exact: true })).toHaveCount(0);
  await page.evaluate(() => { location.hash = "lms-students/456"; });
  await expect(page.locator('[data-app="lms-students"] [data-window-path]')).toHaveText("456");
});
