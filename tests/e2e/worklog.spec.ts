import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { authBaseURL } from "./geeo-mocks";
import { mockWorklog, otherEntry, ownEntry, worklogDay } from "./worklog-mocks";

test.use({ baseURL: authBaseURL });
test.beforeEach(async ({}, info) => {
  test.skip(info.project.name !== "desktop", "Worklog desktop window acceptance");
});

test("opens My Worklog from Work and shows self-scoped payroll data and check-in/out", async ({ page }) => {
  const requests = await mockWorklog(page, ["worklog.read", "workingtime.checkin"]);
  await page.goto("/");
  await expect(page.locator(".geeospace-os")).toHaveAttribute("data-ready", "true");
  await page.getByRole("navigation", { name: "Dock ứng dụng" }).getByRole("button", { name: "Công việc", exact: true }).click();
  await page.locator('[data-app="staff"]').getByRole("button", { name: "Nhật ký công việc" }).click();
  const panel = page.locator('[data-app="lms-worklog"]');
  await expect(panel.getByRole("heading", { name: "My Worklog" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Timesheets" })).toHaveCount(0);
  await expect(panel.getByText("2.5", { exact: true })).toBeVisible();
  await panel.getByRole("button", { name: `View worklog for ${worklogDay}` }).click();
  const details = page.getByRole("dialog");
  await expect(details.getByText(ownEntry.className!)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(details).toHaveCount(0);
  await expect(panel.getByRole("button", { name: `View worklog for ${worklogDay}` })).toBeFocused();
  await panel.getByRole("tab", { name: "Ledger" }).click();
  await expect(panel.getByText(ownEntry.className!)).toBeVisible();
  await panel.getByRole("button", { name: "Check In", exact: true }).click();
  await expect(panel.getByText("Checked In", { exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Check Out", exact: true }).click();
  await expect(panel.getByText("Office · 1.0h")).toBeVisible();
  await panel.getByRole("button", { name: "Previous period" }).click();
  await expect(panel.getByText(ownEntry.className!)).toHaveCount(0);
  expect(requests.filter(request => ["/worklog/query", "/worklog/summary/query"].includes(request.path)).map(request => request.body)).toEqual(
    expect.arrayContaining([expect.objectContaining({ from: "2026-10-26", to: "2026-11-25" })]),
  );
  for (const request of requests.filter(request => ["/worklog/query", "/worklog/summary/query"].includes(request.path))) {
    expect(request.body).not.toHaveProperty("ownerId");
    expect(request.headers.authorization).toBe("Bearer mock-access");
  }
});

test("denies the Timesheets deep link without approval permission before loading work data", async ({ page }) => {
  const requests = await mockWorklog(page, ["worklog.read"]);
  await page.goto("/#lms-worklog/timesheets");
  await expect(page.getByText("You don't have permission to view Timesheets.")).toBeVisible();
  expect(requests).toEqual([]);
  await page.getByRole("button", { name: "My Worklog", exact: true }).click();
  await expect(page).toHaveURL(/#lms-worklog$/);
  await expect(page.getByRole("heading", { name: "My Worklog" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Check In", exact: true })).toHaveCount(0);
});

test("filters and exports Timesheets, prevents self-approval, and patches a successful approval", async ({ page }) => {
  const requests = await mockWorklog(page, ["worklog.read", "worklog.approve"]);
  await page.goto("/#lms-worklog");
  const panel = page.locator('[data-app="lms-worklog"]');
  await panel.getByRole("button", { name: "Timesheets", exact: true }).click();
  await expect(page).toHaveURL(/#lms-worklog\/timesheets$/);
  await panel.getByRole("row", { name: /Explorer 1/ }).getByRole("button", { name: /1 entry/ }).click();
  await expect(page.getByRole("button", { name: "Approve", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");

  await panel.getByRole("searchbox", { name: "Search teacher or class" }).fill("Lily");
  await expect(panel.getByRole("cell", { name: ownEntry.className! })).toHaveCount(0);
  const downloadEvent = page.waitForEvent("download");
  await panel.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("timesheets_2026-11.csv");
  const csv = await readFile(await download.path(), "utf8");
  expect(csv).toContain(otherEntry.className!);
  expect(csv).not.toContain(ownEntry.className!);

  await panel.getByRole("row", { name: /Discover 2/ }).getByRole("button", { name: /1 entry/ }).click();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByText("Accepted", { exact: true })).toBeVisible();
  expect(requests.find(request => request.path === `/worklog/${otherEntry.id}/status`)).toMatchObject({
    body: { status: "Accepted" },
    headers: { authorization: "Bearer mock-access", "if-unmodified-since": otherEntry.updatedAt },
  });
  expect(requests.filter(request => request.path === "/worklog/query/all-teachers")).toHaveLength(1);
  await page.keyboard.press("Escape");
  await panel.getByRole("button", { name: "Quay lại" }).click();
  await expect(page).toHaveURL(/#lms-worklog$/);
  await expect(panel.getByRole("heading", { name: "My Worklog" })).toBeVisible();
});

test("lets a narrow window reach day cells and refetches the grid after a stale approval", async ({ page }) => {
  const requests = await mockWorklog(page, ["worklog.approve"], { conflictOnce: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#lms-worklog/timesheets");
  const panel = page.locator('[data-app="lms-worklog"]');
  await expect(panel.getByRole("columnheader", { name: "Teacher" })).toHaveCSS("position", "static");
  await panel.getByRole("row", { name: /Discover 2/ }).getByRole("button", { name: /1 entry/ }).click();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByText("Rejected", { exact: true })).toBeVisible();
  expect(requests.filter(request => request.path === "/worklog/query/all-teachers")).toHaveLength(2);
});

test("loads every page and teacher batch when the roster exceeds the API limit", async ({ page }) => {
  const requests = await mockWorklog(page, ["worklog.approve"], { largeRoster: true });
  await page.goto("/#lms-worklog/timesheets");
  const panel = page.locator('[data-app="lms-worklog"]');
  await expect(panel.getByRole("cell", { name: ownEntry.className! })).toBeVisible();
  await expect(panel.getByRole("cell", { name: otherEntry.className! })).toBeVisible();
  expect(requests.filter(request => request.path === "/worklog/query/all-teachers").map(({ body }) => {
    const { teacherIds, page } = body as { teacherIds: string[]; page: number };
    return [teacherIds.length, page];
  })).toEqual([[200, 1], [200, 2], [1, 1]]);
});

test("clears the previous period's effort filter when changing periods", async ({ page }) => {
  await mockWorklog(page, ["worklog.approve"], { priorPeriod: true });
  await page.goto("/#lms-worklog/timesheets");
  const panel = page.locator('[data-app="lms-worklog"]');
  await expect(panel.getByRole("cell", { name: ownEntry.className! })).toBeVisible();
  await panel.getByRole("combobox", { name: "Effort type" }).click();
  await page.getByRole("option", { name: "Main Teacher" }).click();
  await expect(panel.getByRole("cell", { name: otherEntry.className! })).toHaveCount(0);
  await panel.getByRole("button", { name: "Previous period" }).click();
  await expect(panel.getByRole("cell", { name: otherEntry.className! })).toBeVisible();
});

test("only flags missing attendance for days with actual work", async ({ page }) => {
  await mockWorklog(page, ["worklog.read"], { offDay: true });
  await page.goto("/#lms-worklog");
  const panel = page.locator('[data-app="lms-worklog"]');
  await panel.getByRole("tab", { name: "Ledger" }).click();
  await expect(panel.getByRole("row", { name: /Explorer 1/ }).getByText("Lệch", { exact: true })).toBeVisible();
  const offDay = panel.getByRole("row", { name: /Day off/ });
  await expect(offDay).toBeVisible();
  await expect(offDay.getByText("Lệch", { exact: true })).toHaveCount(0);
});

test("starts My Worklog in the current period after closing and reopening its window", async ({ page }) => {
  await mockWorklog(page, ["worklog.read"]);
  await page.goto("/#lms-worklog");
  const panel = page.locator('[data-app="lms-worklog"]');
  await panel.getByRole("tab", { name: "Ledger" }).click();
  await expect(panel.getByText(ownEntry.className!, { exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Previous period" }).click();
  await expect(panel.getByText(ownEntry.className!, { exact: true })).toHaveCount(0);
  await panel.getByRole("button", { name: /Đóng.*Nhật ký công việc/ }).click();
  await expect(panel.getByRole("heading", { name: "My Worklog", includeHidden: true })).toHaveCount(0);
  await page.getByRole("navigation", { name: "Dock ứng dụng" }).getByRole("button", { name: "Công việc", exact: true }).click();
  await page.locator('[data-app="staff"]').getByRole("button", { name: "Nhật ký công việc" }).click();
  await expect(panel.getByRole("tab", { name: "Calendar" })).toHaveAttribute("aria-selected", "true");
  await expect(panel.getByRole("button", { name: `View worklog for ${worklogDay}` })).toBeVisible();
});
