import { expect, test } from "@playwright/test";
import { authBaseURL, mockGeeo, mockUser, seedGeeo } from "./geeo-mocks";

test.use({ baseURL: authBaseURL });
test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Browser auth desktop acceptance");
  await mockGeeo(page);
});
test("Account sign-in unlocks LMS, survives reload and gates again after sign-out", async ({ page }) => {
  await page.goto("/#lms");
  const hub = page.locator('[data-app="lms"]');
  await expect(hub.getByRole("heading", { name: "Đăng nhập Gee-O để dùng LMS" })).toBeVisible();
  await hub.getByRole("button", { name: "Mở Tài khoản" }).click();
  const account = page.locator('[data-app="account"]');
  await expect(account.getByRole("heading", { name: "Đăng nhập Gee-O", exact: true })).toBeVisible();
  await expect(account.getByRole("button", { name: "Đăng nhập với Google" })).toHaveCount(0);
  await account.getByLabel("Email", { exact: true }).fill(mockUser.email);
  await account.getByLabel("Mật khẩu", { exact: true }).fill("correct");
  await account.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.locator(".os-account-chip")).toContainText(mockUser.name);
  await expect(account.getByRole("heading", { name: mockUser.name })).toBeVisible();
  await expect(account).toContainText("Teacher");
  await account.getByRole("button", { name: "Đóng Tài khoản", exact: true }).click();
  await hub.getByRole("button", { name: "Lớp học", exact: true }).click();
  const classes = page.locator('[data-app="lms-classes"]');
  await expect(classes.getByRole("heading", { name: "Đang chuyển sang Geeospace" })).toBeVisible();
  await page.reload();
  await expect(page.locator(".os-account-chip")).toContainText(mockUser.name);
  await expect(classes.getByRole("heading", { name: "Đang chuyển sang Geeospace" })).toBeVisible();
  await page.getByRole("button", { name: "Tài khoản Gee-O", exact: true }).click();
  await account.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page.locator(".os-account-chip")).toContainText("Kết nối Gee-O");
  await account.getByRole("button", { name: "Đóng Tài khoản", exact: true }).click();
  await expect(classes.getByRole("heading", { name: "Đăng nhập Gee-O để dùng LMS" })).toBeVisible();
  expect((await page.context().cookies()).some(cookie => ["GEEO.AUTH", "GEEO.USERINFO"].includes(cookie.name))).toBe(false);
  await page.reload();
  await expect(classes.getByRole("heading", { name: "Đăng nhập Gee-O để dùng LMS" })).toBeVisible();
});
test("wrong password reports an error and does not unlock LMS", async ({ page }) => {
  await page.goto("/#account");
  const account = page.locator('[data-app="account"]');
  await account.getByLabel("Email", { exact: true }).fill(mockUser.email);
  await account.getByLabel("Mật khẩu", { exact: true }).fill("wrong");
  await account.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(account.getByRole("alert")).toContainText("Đăng nhập thất bại");
  await expect(page.locator(".os-account-chip")).toContainText("Kết nối Gee-O");
  await page.goto("/#lms-classes");
  await expect(page.locator(".os-lms-gate")).toContainText("Đăng nhập Gee-O để dùng LMS");
});
test("all Gee-O groups gate signed-out users and unlock their hubs and apps", async ({ page }) => {
  for (const id of ["lms", "staff", "admin", "requests", "work", "lms-worklog", "lms-form-templates", "lms-users", "lms-roles"]) {
    await page.goto(`/#${id}`);
    await expect(page.locator(`[data-app="${id}"] .os-lms-gate`)).toBeVisible();
  }
  await seedGeeo(page.context());
  await page.reload();
  for (const [id, child] of [["staff", "Yêu cầu của tôi"], ["admin", "Người dùng"]]) {
    await page.goto(`/#${id}`);
    await page.locator(`[data-app="${id}"]`).getByRole("button", { name: child, exact: true }).click();
    await expect(page.locator(".os-window-active .os-lms-gate")).toHaveCount(0);
  }
  await page.goto("/#account");
  await page.locator('[data-app="account"]').getByRole("button", { name: "Đăng xuất", exact: true }).click();
  for (const id of ["staff", "admin", "requests", "work"]) {
    await page.goto(`/#${id}`);
    await expect(page.locator(`[data-app="${id}"] .os-lms-gate`)).toBeVisible();
  }
});
test("unconfigured workspace stays usable without any Gee-O fetch", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", request => {
    if (/geeo\.test|connect\/(token|userinfo)/.test(request.url())) requests.push(request.url());
  });
  await page.goto("http://127.0.0.1:3100/#account");
  await expect(page.locator('[data-app="account"]').getByRole("heading", { name: "Kết nối đăng nhập chưa được thiết lập." })).toBeVisible();
  await page.goto("http://127.0.0.1:3100/#lms");
  await expect(page.locator(".os-lms-gate")).toContainText("Đăng nhập Gee-O để dùng LMS");
  expect(requests).toEqual([]);
});
