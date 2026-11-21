import { expect, test, type Page } from "@playwright/test";
import { join } from "node:path";
import { authBaseURL, mockGeeo, mockUser, seedGeeo } from "./geeo-mocks";
import { PERMISSIONS } from "../../lib/permissions";
import { ScheduleSchema, ScheduleCalendarEventSchema } from "../../features/lms/types/schedule";
import { ClassCourseGridSchema } from "../../features/lms/types/class";
import { AbsentStudentSchema, SingleLessonDtoSchema } from "../../features/lms/types/attendance";

test.use({ baseURL: authBaseURL, viewport: { width: 1440, height: 900 } });

const schedule = ScheduleSchema.parse({
  id: "schedule-1", name: "Evening Starters", monday: true, tuesday: false,
  wednesday: true, thursday: false, friday: false, saturday: false, sunday: false,
  startDate: "2026-01-01", endDate: "2027-12-31", startTime: "2026-01-01T17:30:00",
  endTime: "2026-01-01T19:00:00", classCourseId: "class-1", classCourseName: "Starters A",
  classRoomId: "room-1", classRoomName: "Sunshine Room", campusId: "campus-1", campusName: "Central Campus",
});
const classCourse = ClassCourseGridSchema.parse({
  id: "class-1", name: "Starters A", levelId: "level-1", levelName: "Starters",
  campusId: "campus-1", campusName: "Central Campus", schedule: "Mon, Wed",
  startDate: "2026-01-01", endDate: "2027-12-31", startTime: "17:30", endTime: "19:00",
  teachers: "Mai - Mai Nguyen", numberOfStudents: 12, teachingProgress: 10, isFinished: false,
});
const event = SingleLessonDtoSchema.parse({
  id: "event-1", name: "Speaking Workshop", type: 2, typeFormat: "WorkShop",
  roomId: "room-1", branchId: "campus-1", startTime: "2026-07-06T17:30:00",
  endTime: "2026-07-06T19:00:00", startTimeStr: "06/07/2026 17:30", endTimeStr: "06/07/2026 19:00",
  isArchived: false, numOfStudent: 1, studentIds: ["student-1"], teacherIds: ["teacher-1"],
});
const absentStudent = AbsentStudentSchema.parse({
  studentName: "Tran Minh Anh", englishName: "Anna", class: "Starters A",
  fatherName: null, fatherPhone: null, motherName: "Lan Tran", motherPhone: "0900000000",
});

async function setup(page: Page, { empty = false, writable = true } = {}) {
  const unexpected: string[] = [];
  await mockGeeo(page);
  await page.route("https://auth.geeo.test/connect/userinfo", route => route.fulfill({
    headers: { "access-control-allow-origin": "*" },
    json: { ...mockUser, permission: writable ? Object.values(PERMISSIONS) : [PERMISSIONS.CLASS_READ] },
  }));
  await seedGeeo(page.context());
  await page.route("https://api.geeo.test/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization,content-type", "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS" };
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    const paged = (items: unknown[]) => ({ items, page: 1, pageSize: 500, total: items.length, hasNext: false });
    const rows = <T,>(items: T[]) => empty ? [] : items;
    let json: unknown;
    if (path === "/api/v2/class/Schedules/all") json = rows([schedule]);
    else if (path === "/api/v2/class/classes/all") json = rows([classCourse]);
    else if (path === "/api/v2/class/classes/query") json = paged(rows([classCourse]));
    else if (path === "/api/v2/lookups/lookups/campuses") json = [{ id: "campus-1", name: "Central Campus" }];
    else if (path === "/api/v2/class/Timetable/events") {
      const date = new Date();
      const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      json = rows([ScheduleCalendarEventSchema.parse({ id: "lesson-1", title: "Starters A", campusId: "campus-1", startTime: `${day}T17:30:00`, endTime: `${day}T19:00:00` })]);
    } else if (path === "/api/v2/attendance/events/query") json = paged(rows([event]));
    else if (path === "/api/v2/attendance/catchups/absent") json = rows([absentStudent]);
    else if (path === "/api/v2/attendance/catchups/lookups/class-lessons" || path === "/api/v2/attendance/catchups/lookups/class-courses") json = [];
    else if (path === "/api/v2/academic/Holidays") json = { generalHolidays: empty ? [] : ["2026-12-25", "2026-01-01"], classHolidays: empty ? [] : [{ classId: "class-1", className: "Starters A", daysOff: ["2026-12-26"], excludeDays: ["2026-12-27"] }] };
    else {
      unexpected.push(`${request.method()} ${path}`);
      return route.fulfill({ status: 501, headers, json: { title: "Unexpected mock request" } });
    }
    return route.fulfill({ headers, json });
  });
  await page.goto("/");
  await expect(page.locator(".geeospace-os")).toHaveAttribute("data-ready", "true");
  return unexpected;
}

async function launch(page: Page, query: string, id: string, maximize = true) {
  await page.keyboard.press("Control+k");
  const launcher = page.getByRole("dialog", { name: "Tìm nhanh chức năng" });
  await launcher.getByRole("combobox").fill(query);
  await page.keyboard.press("Enter");
  const panel = page.locator(`[data-app="${id}"]`);
  await expect(panel).toBeVisible();
  if (maximize && await panel.getAttribute("data-mode") !== "maximized") {
    await panel.getByRole("button", { name: /Phóng to hoặc khôi phục/ }).click();
  }
  return panel;
}

async function screenshot(page: Page, name: string) {
  const path = process.env.LMS_SCREENSHOT_DIR ? join(process.env.LMS_SCREENSHOT_DIR, `${name}.png`) : test.info().outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true });
}

test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "Desktop LMS scheduling acceptance"));

test("launcher opens all four real scheduling panels and a styled schedule dialog", async ({ page }) => {
  const unexpected = await setup(page);
  const schedulePanel = await launch(page, "Lịch học", "lms-schedule");
  await expect(schedulePanel.getByRole("cell", { name: "Evening Starters", exact: true })).toBeVisible();
  await screenshot(page, "lms-schedule");
  await schedulePanel.getByRole("button", { name: "Set Schedule", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Set Schedule", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveClass(/lms-ui/);
  await expect(dialog).toHaveCSS("z-index", "450");
  expect(await dialog.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
  await expect(dialog.getByLabel("Name", { exact: false }).first()).toBeVisible();
  await screenshot(page, "lms-schedule-dialog");
  await page.keyboard.press("Escape");
  await schedulePanel.getByRole("button", { name: "Đóng Lịch học", exact: true }).click();

  const timetable = await launch(page, "Timetable", "lms-timetable");
  await expect(timetable.getByText("Starters A", { exact: true }).first()).toBeVisible();
  await screenshot(page, "lms-timetable");
  await timetable.getByRole("button", { name: "Đóng Thời khóa biểu", exact: true }).click();

  const attendance = await launch(page, "Attendance", "lms-attendance");
  await expect(attendance.getByRole("cell", { name: "Speaking Workshop", exact: true })).toBeVisible();
  await expect(attendance.getByText("Anna", { exact: true })).toBeVisible();
  await screenshot(page, "lms-attendance");
  await attendance.getByRole("button", { name: "Đóng Điểm danh", exact: true }).click();

  const holidays = await launch(page, "Holidays", "lms-holidays");
  await expect(holidays.getByText("2026-12-25", { exact: true })).toBeVisible();
  await screenshot(page, "lms-holidays");
  await holidays.getByRole("combobox").click();
  const popover = page.locator('[data-slot="popover-content"]');
  await expect(popover.getByRole("option", { name: "Starters A (Starters)" })).toBeVisible();
  await expect(popover).toHaveClass(/lms-ui/);
  await expect(popover).toHaveCSS("z-index", "450");
  expect(await popover.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
  await screenshot(page, "lms-holidays-popover");
  expect(unexpected).toEqual([]);
});

test("read-only permissions hide write actions while deep links still render data", async ({ page }) => {
  const unexpected = await setup(page, { writable: false });
  await page.goto("/#lms-schedule");
  const panel = page.locator('[data-app="lms-schedule"]');
  await expect(panel.getByText("Evening Starters", { exact: true })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Set Schedule" })).toHaveCount(0);
  await panel.getByRole("button", { name: "View Timetable" }).click();
  const timetable = page.locator('[data-app="lms-timetable"]');
  await timetable.getByRole("button", { name: "List view", exact: true }).click();
  await expect(timetable.getByText("Starters A", { exact: true }).first()).toBeVisible();
  expect(unexpected).toEqual([]);
});

test("empty API data keeps the schedule usable", async ({ page }) => {
  const unexpected = await setup(page, { empty: true });
  const panel = await launch(page, "Lịch học", "lms-schedule");
  await expect(panel.getByText("No schedules found", { exact: false })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Set Schedule" })).toBeVisible();
  expect(unexpected).toEqual([]);
});

test("default-size windows use narrow layouts on a desktop viewport", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const unexpected = await setup(page);
  for (const [query, id, name] of [
    ["Lịch học", "lms-schedule", "schedule"],
    ["Timetable", "lms-timetable", "timetable"],
    ["Attendance", "lms-attendance", "attendance"],
    ["Holidays", "lms-holidays", "holidays"],
  ]) {
    const panel = await launch(page, query, id, false);
    await expect(panel).toHaveAttribute("data-mode", "normal");
    await expect(panel).toHaveAttribute("data-phase", "visible");
    expect((await panel.boundingBox())?.width).toBe(510);
    const scope = panel.locator(".lms-ui").first();
    await expect(scope).toHaveCSS("container-type", "inline-size");

    if (name === "schedule") {
      await expect(panel.getByRole("cell", { name: "Evening Starters", exact: true })).toBeVisible();
      const search = panel.getByPlaceholder("Search schedules, class, room...");
      expect((await search.boundingBox())!.width).toBeGreaterThan(400);
      await expect(panel.getByRole("button", { name: "Last page" })).toBeVisible();
      await expect(panel.getByRole("button", { name: "Last page" })).toBeInViewport({ ratio: 1 });
    } else if (name === "timetable") {
      const list = panel.getByRole("button", { name: "List view", exact: true });
      await expect(list).toBeVisible();
      await list.click();
      await expect(panel.getByText("Starters A", { exact: true }).first()).toBeVisible();
      await panel.getByRole("button", { name: "Calendar view", exact: true }).click();
      await expect(panel.getByRole("button", { name: "Next month", exact: true })).toBeInViewport({ ratio: 1 });
      const weekdays = panel.getByText(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/, { exact: true });
      await expect(weekdays).toHaveCount(7);
      for (const day of await weekdays.all()) {
        await expect(day).toBeVisible();
        expect((await day.boundingBox())!.width).toBeGreaterThan(60);
      }
    } else if (name === "attendance") {
      await expect(panel.getByText("Anna", { exact: true })).toBeVisible();
      await expect(panel.getByText("Absent Students", { exact: true })).toBeInViewport({ ratio: 1 });
      const absent = (await panel.getByText("Absent Students", { exact: true }).boundingBox())!;
      const events = (await panel.getByText("Scheduled Events", { exact: true }).boundingBox())!;
      expect(events.y).toBeGreaterThan(absent.y + absent.height);
      await expect(panel.getByRole("cell", { name: "Speaking Workshop", exact: true })).toBeVisible();
    } else {
      await expect(panel.getByText("2026-12-25", { exact: true })).toBeVisible();
      const picker = panel.getByRole("combobox");
      await expect(picker).toBeVisible();
      await expect(picker).toBeInViewport({ ratio: 1 });
      expect((await picker.boundingBox())!.width).toBeGreaterThan(400);
    }
    expect(await scope.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await screenshot(page, `narrow-${name}`);
    await panel.locator(".os-light-close").click();
  }
  expect(unexpected).toEqual([]);
});
