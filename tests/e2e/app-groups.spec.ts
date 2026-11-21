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

test("work and administration hubs share dock state with their children", async ({ page }) => {
  const dock = page.locator(".os-dock");
  for (const [id, name, child, childName] of [["staff", "Công việc", "lms-worklog", "Nhật ký công việc"], ["admin", "Quản trị", "lms-users", "Người dùng"]]) {
    const entry = dock.getByRole("button", { name, exact: true });
    await expect(entry).toHaveCount(1);
    await entry.click();
    const hub = page.locator(`[data-app="${id}"]`);
    await hub.getByRole("button", { name: childName, exact: true }).click();
    await expect(page.locator(`[data-app="${child}"]`)).toBeVisible();
    await expect(entry).toHaveAttribute("aria-current", "true");
    await hub.getByRole("button", { name: `Đóng ${name}`, exact: true }).click({ force: true });
    await expect(entry).toHaveAttribute("data-running", "true");
  }
  await expect(dock.locator('[data-launch-app="work"], [data-launch-app="requests"], [data-launch-app^="lms-"]')).toHaveCount(0);
  await page.goto("/#lms-requests/123");
  await expect(page.locator('[data-app="requests"]')).toBeVisible();
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
  await expect(dialog.locator(".os-launcher-group-heading")).toHaveText(["Không gian làm việc", "Gee-O LMS", "Công việc", "Quản trị"]);
  const input = dialog.getByRole("combobox");
  await input.fill("yeu cau cua toi");
  await expect(dialog.getByRole("option")).toHaveCount(1);
  await expect(dialog.getByRole("option")).toContainText("Công việc");
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-app="requests"]')).toBeVisible();
  await page.keyboard.press("Control+k");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Đóng tìm kiếm" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("combobox")).toBeFocused();
  await dialog.getByRole("combobox").fill("Levels Lessons");
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-app="lms-curriculum"]')).toBeVisible();
});

test("search selects an app match before group-only matches", async ({ page }) => {
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Tìm nhanh chức năng" });
  await dialog.getByRole("combobox").fill("Administration");
  await expect(dialog.getByRole("option").nth(0)).toContainText("Quản trị");
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-app="admin"]')).toBeVisible();
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

test("mobile navigation history survives returning to desktop", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#lms-classes");
  const classes = page.locator('[data-app="lms-classes"]');
  await classes.getByRole("button", { name: "Chi tiết mẫu", exact: true }).click();
  await classes.getByRole("button", { name: "Tổng quan mẫu", exact: true }).click();
  await expect(classes.locator("[data-window-path]")).toHaveText("123/overview");
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator(".os-dock")).toBeVisible();
  await classes.getByRole("button", { name: "Quay lại", exact: true }).click();
  await expect(classes.locator("[data-window-path]")).toHaveText("123");
  await classes.getByRole("button", { name: "Quay lại", exact: true }).click();
  await expect(classes.locator("[data-window-path]")).toHaveText("/");
  await expect(classes.getByRole("button", { name: "Quay lại", exact: true })).toHaveCount(0);
});
