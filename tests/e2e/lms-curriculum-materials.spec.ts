import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { authBaseURL, seedGeeo } from "./geeo-mocks";

test.use({ baseURL: authBaseURL });
test("launcher opens curriculum and materials with mocked APIs", async ({ page }) => {
  const permissions = ["curriculum.read", "curriculum.create", "curriculum.update", "curriculum.delete", "content.material.read", "content.material.write", "content.material.approve"];
  await seedGeeo(page.context());
  await page.route("https://auth.geeo.test/connect/**", route => route.fulfill({ headers: { "access-control-allow-origin": "*" }, json: { sub: "teacher-1", name: "Mai Nguyen", permission: permissions, role: ["Teacher"] } }));
  const level = { id: "level-1", name: "Explorers", numberOfLesson: 12, lessonTime: 90, lessonPlanCount: 1, description: "Discover, practice and grow" };
  const lesson = { id: "lesson-1", levelId: level.id, levelName: level.name, lesson: "1", subject: "Numbers and counting", content: "Learn numbers through play" };
  const material = { id: "material-1", name: "Counting practice", description: "Classroom counting resource", materialFormat: 3, materialFormatText: "PDF", materialCategories: "Math", url: null, fileName: "counting.pdf", approved: true, teacherName: "Mai Nguyen" };
  await page.route("https://api.geeo.test/**", async route => {
    const path = new URL(route.request().url()).pathname;
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (path.endsWith("/counting.pdf")) {
      expect(route.request().headers().authorization).toBe("Bearer mock-access");
      const stream = "BT /F1 28 Tf 60 720 Td (Counting practice) Tj 0 -50 Td /F1 18 Tf (One, two, three - count with me!) Tj ET";
      const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
      let pdf = "%PDF-1.4\n";
      const offsets = [0];
      objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
      const xref = pdf.length;
      pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
      return route.fulfill({ headers, contentType: "application/pdf", body: pdf });
    }
    let json: unknown = [];
    if (path.endsWith("/levels")) json = [level];
    else if (path.endsWith("/levels/level-1")) json = level;
    else if (path.endsWith("/levels/level-1/lessons")) json = [lesson];
    else if (path.endsWith("/lessons/lesson-1")) json = lesson;
    else if (path.endsWith("/units")) json = [{ id: "unit-1", lessonPlanId: lesson.id, sortOrder: 1, time: 15, procedures: "Warm-up", description: "Count and sing together", teacherActivities: "Lead the counting song", learningOutcome: "Count from one to ten" }];
    else if (path.endsWith("/content")) json = { id: "content-1", lessonPlanId: lesson.id, textbook: "Explorers Book 1", page: "12", coreWords: "<p>One, two, three</p>", keyWords: "<p>Numbers</p>", keyQuestions: "<p>How many?</p>", keyAnswers: "<p>There are three.</p>", activities: "<p>Count the classroom objects.</p>", media: "[]" };
    else if (path.endsWith("/Materials/query")) json = { items: [material], total: 1, page: 1, pageSize: 20, hasNext: false };
    await route.fulfill({ headers, json });
  });
  await page.goto("/");
  await expect(page.locator(".geeospace-os")).toHaveAttribute("data-ready", "true");
  const launcher = page.getByRole("dialog", { name: "Tất cả ứng dụng", exact: true });
  await page.locator(".os-dock").getByRole("button", { name: "Tất cả ứng dụng", exact: true }).click();
  await launcher.getByRole("option", { name: /Giáo trình/ }).click();
  const curriculum = page.locator('[data-app="lms-curriculum"]');
  await curriculum.getByRole("button", { name: "Phóng to hoặc khôi phục Giáo trình", exact: true }).click();
  await expect(curriculum.getByText("Explorers", { exact: true })).toBeVisible();
  if (process.env.LMS_SCREENSHOTS) { await mkdir("/home/ubuntu/shots", { recursive: true }); await page.screenshot({ path: "/home/ubuntu/shots/curriculum-levels.png", fullPage: true }); }
  await curriculum.getByText("Explorers", { exact: true }).click();
  await expect(curriculum.getByText("Numbers and counting", { exact: true })).toBeVisible();
  await page.goto("/#lms-curriculum/lessons/lesson-1/units");
  await expect(curriculum.getByText("Warm-up", { exact: true })).toBeVisible();
  if (process.env.LMS_SCREENSHOTS) await page.screenshot({ path: "/home/ubuntu/shots/curriculum-units.png", fullPage: true });
  await curriculum.getByRole("button", { name: "Content", exact: true }).click();
  await expect(curriculum.getByText("One, two, three", { exact: true })).toBeVisible();
  if (process.env.LMS_SCREENSHOTS) await page.screenshot({ path: "/home/ubuntu/shots/curriculum-content.png", fullPage: true });
  await page.locator(".os-dock").getByRole("button", { name: "Tất cả ứng dụng", exact: true }).click();
  await launcher.getByRole("option", { name: /Học liệu/ }).click();
  const materials = page.locator('[data-app="lms-materials"]');
  await materials.getByRole("button", { name: "Phóng to hoặc khôi phục Học liệu", exact: true }).click();
  await expect(materials.getByText("Counting practice", { exact: true })).toBeVisible();
  if (process.env.LMS_SCREENSHOTS) await page.screenshot({ path: "/home/ubuntu/shots/materials-list.png", fullPage: true });
  await materials.getByText("Counting practice", { exact: true }).click();
  await materials.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Counting practice" })).toBeVisible();
  await expect(page.locator(".react-pdf__Page canvas")).toBeVisible();
  if (process.env.LMS_SCREENSHOTS) await page.screenshot({ path: "/home/ubuntu/shots/material-preview.png", fullPage: true });
});
