import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAllTeachers, fetchStudentReport, saveStudentLessonLog } from "@/features/lms/lib/classes/api";
import { getWorksheetUrl, uploadWorksheet } from "@/features/lms/lib/curriculum/api";
import { getMaterialViewUrl, uploadMaterialFile } from "@/features/lms/lib/materials/api";
import { getErrorDetail, isConflictError } from "@/features/lms/lib/requests/api";
import { fetchClassDropdown } from "@/features/lms/lib/students/api";
import { apiFetch, configureLmsTransport, queryPaged } from "@/features/lms/lib/transport";
import { getUserFileUrl } from "@/features/lms/lib/users/api";
import { getConflictUpdatedAt, isConcurrencyError, updateWorkLog } from "@/features/lms/lib/worklog/api";
import { getRolePermissionKeys } from "@/features/lms/types/role";

const request = vi.fn();
let cleanup: (() => void) | undefined;

function installAdapter() {
  cleanup = configureLmsTransport({ request, resolveUrl: (path) => `https://lms.example${path}` });
}

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  request.mockReset();
});

describe("LMS domain transport boundary", () => {
  it("rejects without an adapter instead of trying a relative fetch", async () => {
    await expect(apiFetch("/api/v2/unknown")).rejects.toThrow("GeeO LMS transport is not configured");
  });

  it("forwards a paged request and keeps the server's pagination metadata", async () => {
    installAdapter();
    const page = { items: [{ id: "class-1" }], page: 1, pageSize: 25, hasNext: true };
    request.mockResolvedValue(page);

    await expect(queryPaged("/api/v2/class/classes/query")).resolves.toEqual(page);
    expect(request).toHaveBeenCalledWith("/api/v2/class/classes/query", {
      method: "POST",
      body: { page: 1, pageSize: 25 },
    });
  });

  it("uses the same transport for legacy routes and keeps the teacher name mapping", async () => {
    installAdapter();
    request.mockResolvedValueOnce([{ id: "teacher-1", firstName: "Minh", lastName: "Le" }]);
    request.mockResolvedValueOnce([{ id: "class-1", name: "Class 1" }]);

    await expect(fetchAllTeachers()).resolves.toEqual([
      { id: "teacher-1", firstName: "Minh", lastName: "Le", fullName: "Minh Le" },
    ]);
    await fetchClassDropdown("user/id");

    expect(request).toHaveBeenNthCalledWith(1, "/api/AspNetUsers/teacher", { method: "GET" });
    expect(request).toHaveBeenNthCalledWith(2, "/api/ClassCourses/GetClassCourseDropDown/user%2Fid", { method: "GET" });
  });

  it("forwards both upload part names and permits empty success bodies", async () => {
    installAdapter();
    const file = new File(["worksheet"], "worksheet.pdf", { type: "application/pdf" });

    await uploadWorksheet("lesson-1", file);
    await uploadMaterialFile("material-1", file);

    for (const [index, path, part] of [
      [0, "/api/v2/curriculum/lessons/lesson-1/files", "files"],
      [1, "/api/v2/content/Materials/material-1/file", "file"],
    ] as const) {
      const [receivedPath, options] = request.mock.calls[index];
      expect(receivedPath).toBe(path);
      expect(options).toMatchObject({ method: "POST", responseType: "void" });
      expect(options.body).toBeInstanceOf(FormData);
      expect(options.body.get(part)).toBe(file);
    }
  });

  it("reads and updates attendance under the selected class and lesson log", async () => {
    installAdapter();
    request.mockResolvedValueOnce([]);
    const data = { present: 1, starScore: 3, note: "Participated" };

    await fetchStudentReport("class-1", "log-3");
    await saveStudentLessonLog("class-1", "log-3", "attendance-2", data);

    const base = "/api/v2/class/classes/class-1/reports/log-3/students";
    expect(request).toHaveBeenNthCalledWith(1, base, { method: "GET" });
    expect(request).toHaveBeenNthCalledWith(2, `${base}/attendance-2`, { method: "PUT", body: data });
  });

  it("resolves encoded file paths using the adapter, without fetching them", () => {
    installAdapter();
    expect(getWorksheetUrl("lesson-1", "sheet #1.pdf")).toBe(
      "https://lms.example/api/v2/curriculum/lessons/lesson-1/files/sheet%20%231.pdf",
    );
    expect(getMaterialViewUrl("material-1", "a+b.pdf")).toBe(
      "https://lms.example/api/v2/content/Materials/material-1/file/a%2Bb.pdf",
    );
    expect(getUserFileUrl("user-1", "some file.pdf")).toBe(
      "https://lms.example/api/v2/users/Users/user-1/files/some%20file.pdf",
    );
    expect(request).not.toHaveBeenCalled();
  });

  it("preserves concurrency tokens and reads the adapter's problem details", async () => {
    installAdapter();
    const error = Object.assign(new Error("Stale edit"), {
      name: "ApiError",
      status: 409,
      problem: { errorCode: "CONFLICT", currentUpdatedAt: "latest", detail: "Reload the row." },
    });
    request.mockRejectedValue(error);

    await expect(updateWorkLog("entry-1", { score: 2 }, "previous")).rejects.toBe(error);
    expect(request).toHaveBeenCalledWith("/api/v2/working-time/worklog/entry-1", {
      method: "PUT",
      headers: { "If-Unmodified-Since": "previous" },
      body: { score: 2, comment: "", evaluate: false, order: 0 },
    });
    expect(isConflictError(error)).toBe(true);
    expect(isConcurrencyError(error)).toBe(true);
    expect(getConflictUpdatedAt(error)).toBe("latest");
    expect(getErrorDetail(error, "Unexpected error")).toBe("Reload the row.");
    expect(isConflictError(new Error("Conflict"))).toBe(false);
  });

  it("derives grantable role keys from the platform's current permission catalog", () => {
    expect(getRolePermissionKeys({ app: "classapp.client", read: "forms.requests.read" })).toEqual([
      "forms.requests.read",
    ]);
  });
});
