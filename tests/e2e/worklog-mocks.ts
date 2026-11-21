import type { Page } from "@playwright/test";
import type { AttendanceItem, TimebookSummary, WorkLogItemV2 } from "../../features/lms/types/worklog";
import { mockGeeo, mockUser, seedGeeo } from "./geeo-mocks";

export const worklogNow = new Date("2026-11-02T03:00:00Z");
export const worklogDay = "2026-11-02";
const updatedAt = `${worklogDay}T08:00:00+07:00`;
export const ownEntry: WorkLogItemV2 = {
  id: "worklog-1",
  teacherId: mockUser.sub,
  teacherName: "May - Mai Nguyen",
  classId: "class-1",
  className: "Explorer 1",
  level: "Explorer",
  effortType: "main_teacher",
  status: 0,
  isExpat: false,
  evaluate: false,
  isEvent: false,
  eventTime: 0,
  score: 1.25,
  lessonStart: `${worklogDay}T08:30:00+07:00`,
  comment: "Speaking practice",
  order: 0,
  createdAt: updatedAt,
  updatedAt,
};
export const otherEntry: WorkLogItemV2 = {
  ...ownEntry,
  id: "worklog-2",
  teacherId: "teacher-2",
  teacherName: "Lily - Linh Tran",
  classId: "class-2",
  className: "Discover 2",
  level: "Discover",
  effortType: "co_teacher",
  score: 0.75,
  comment: "Group activity",
};
const summary: TimebookSummary = {
  mtShift: 1.25, mfShift: 0, ctShift: 0, halfShift: 0, aloneShift: 0,
  catchUpShift: 0, otherShift: 1.25, supShift: 0, daysOff: 0, total: 2.5,
};
const attendance: AttendanceItem = {
  id: "attendance-1",
  staffId: mockUser.sub,
  campusId: "campus-1",
  checkInTime: `${worklogDay}T09:00:00+07:00`,
  workHours: 0,
  workType: 0,
  status: 1,
  createdAt: updatedAt,
};

export async function mockWorklog(page: Page, permission: string[], options?: { conflictOnce?: boolean }) {
  await page.clock.setFixedTime(worklogNow);
  await mockGeeo(page, { ...mockUser, permission });
  await seedGeeo(page.context());

  const requests: { path: string; body: unknown; headers: Record<string, string> }[] = [];
  let entries = [ownEntry, otherEntry];
  let currentAttendance: AttendanceItem[] = [];
  let conflictOnce = options?.conflictOnce;
  const headers = {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization, content-type, if-unmodified-since, x-idempotency-key",
    "access-control-allow-methods": "GET, POST, OPTIONS",
  };

  await page.route("https://api.geeo.test/**", async route => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/v2/working-time", "");
    const body = request.postDataJSON() as { from?: string; to?: string; status?: string } | null;
    requests.push({ path, body, headers: request.headers() });
    const containsDay = (from?: string | null, to?: string | null) => !!from && !!to && from <= worklogDay && worklogDay <= to;
    const paged = (items: WorkLogItemV2[]) => ({
      items: containsDay(body?.from, body?.to) ? items : [], page: 1, pageSize: 2000, hasNext: false,
    });
    const json = (data: unknown) => route.fulfill({ headers, json: data });
    switch (path) {
      case "/api/AspNetUsers/teacher":
        return json([
          { id: ownEntry.teacherId, firstName: "Mai", lastName: "Nguyen", englishName: "May" },
          { id: otherEntry.teacherId, firstName: "Linh", lastName: "Tran", englishName: "Lily" },
        ]);
      case "/worklog/query":
        return json(paged(entries.filter(item => item.teacherId === mockUser.sub)));
      case "/worklog/query/all-teachers":
        return json(paged(entries));
      case "/worklog/summary/query":
        return json(containsDay(body?.from, body?.to) ? summary : { ...summary, mtShift: 0, otherShift: 0, total: 0 });
      case "/worklog/shift-options":
        return json([{ value: "main_teacher", label: "Main Teacher", score: 1.25 }, { value: "co_teacher", label: "Co-teacher", score: 0.75 }]);
      case "/attendance/me":
        return json(containsDay(url.searchParams.get("from"), url.searchParams.get("to")) ? currentAttendance : []);
      case "/check-in":
        currentAttendance = [attendance];
        return json(attendance);
      case "/check-out":
        currentAttendance = [{ ...attendance, checkOutTime: `${worklogDay}T10:00:00+07:00`, workHours: 1 }];
        return json(currentAttendance[0]);
      case `/worklog/${otherEntry.id}/status`: {
        const nextUpdatedAt = `${worklogDay}T10:00:00+07:00`;
        const updated = { ...otherEntry, status: conflictOnce ? 2 : body?.status === "Accepted" ? 1 : 2, updatedAt: nextUpdatedAt };
        entries = [ownEntry, updated];
        if (conflictOnce) {
          conflictOnce = false;
          return route.fulfill({
            status: 409,
            headers,
            contentType: "application/problem+json",
            body: JSON.stringify({ status: 409, title: "Conflict", detail: "This entry changed.", errorCode: "CONFLICT" }),
          });
        }
        return json(updated);
      }
      default:
        return route.fulfill({ status: 404, headers, json: { title: "Unexpected test request", detail: path } });
    }
  });
  return requests;
}
