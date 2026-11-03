import { expect, test } from "@playwright/test";
const origin = "http://127.0.0.1:3200";
test("calendar React views preserve campus, date and keyboard behavior across responsive layouts", async ({ page }) => {
  await page.route(`${origin}/api/events?**`, route => {
    const day = new URL(route.request().url()).searchParams.get("from")!;
    return route.fulfill({ json: { events: [
      { id: "one", title: "Lesson one", start: `${day}T09:00:00+07:00`, end: `${day}T10:00:00+07:00`, campusId: "a", campusName: "Campus A", location: "Room A" },
      { id: "two", title: "Lesson two", start: `${day}T10:00:00+07:00`, end: `${day}T11:00:00+07:00`, campusId: "b", campusName: "Campus B" },
    ] } });
  });
  await page.goto(origin);
  await expect(page.locator('.event')).toHaveCount(2);
  await expect(page.locator('button[data-slot="button"]').first()).toBeVisible();
  await page.getByLabel("Branch", { exact: true }).selectOption("a");
  await expect(page.locator('.event')).toHaveCount(1);
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await expect(page.locator('.calendar')).toHaveAttribute('data-view', 'month');
  await page.getByRole("button", { name: "Next period", exact: true }).click();
  await expect(page.getByLabel("Branch", { exact: true })).toHaveValue("a");
  await page.locator('.month-day').first().click();
  await expect(page.locator('.calendar')).toHaveAttribute('data-view', 'agenda');
  await expect(page.getByRole("button", { name: "Agenda", exact: true })).toBeFocused();
  await expect(page.locator('.event')).toHaveCount(1);
  for (const width of [320, 375, 640, 641, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.route(`${origin}/api/events?**`, route => route.fulfill({ status: 403, json: { code: "CALENDAR_FORBIDDEN" } }));
  await page.getByRole("button", { name: "Next period", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Calendar access is restricted");
  await expect(page.locator('.event')).toHaveCount(0);
});
test("calendar embeds with one identity and theme/locale from SpaceOS", async ({ page }) => {
  await page.route(`${origin}/api/events?**`, route => route.fulfill({ json: { events: [] } }));
  await page.goto("/calendar");
  const frame = page.frameLocator('[data-app="calendar"] iframe');
  await expect(frame.locator('html')).toHaveAttribute('data-presentation','embedded');
  await expect(frame.locator('.space-app-identity')).toBeHidden();
  await frame.getByRole('button',{name:'Tháng',exact:true}).click();
  const heading = await frame.locator('#range-title').textContent();
  await page.getByRole('button',{name:'Chuyển sang chế độ sáng'}).click();
  await expect(frame.locator('html')).toHaveAttribute('data-theme','light');
  await expect(frame.locator('#range-title')).toHaveText(heading!);
  const toggle=page.getByRole('button',{name:'Tiện ích',exact:true}); if(await toggle.isVisible()) await toggle.click();
  await page.getByRole('button',{name:'Đổi ngôn ngữ sang tiếng Anh'}).click();
  await expect(frame.locator('html')).toHaveAttribute('lang','en');
  await expect(frame.locator('.calendar')).toHaveAttribute('data-view','month');
});
