import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { RequestDetail, RequestListItem, Field } from "../../features/lms/types/request";
import type { TemplateDetail } from "../../features/lms/types/form-template";
import type { ProcessStepDto } from "../../features/forms/form-templates/[id]/workflow/types/workflow";
import { authBaseURL, mockGeeo, mockUser, seedGeeo } from "./geeo-mocks";

test.use({ baseURL: authBaseURL });

const timestamp = "2026-10-20T08:00:00Z";
const user = { id: mockUser.sub, fullName: mockUser.name, email: mockUser.email };
const fields: Field[] = [
  { id: "reason", fieldName: "reason", inputKey: "reason", label: "Lý do nghỉ phép",
    type: 0, required: true, hidden: false, displayOrder: 0, config: { maxLength: 200 }, value: "Family appointment" },
  { id: "days", fieldName: "days", inputKey: "days", label: "Số ngày",
    type: 8, required: true, hidden: false, displayOrder: 1, config: { min: 1, max: 14 }, value: 2 },
  { id: "notes", fieldName: "notes", inputKey: "notes", label: "Ghi chú bàn giao",
    type: 1, required: false, hidden: false, displayOrder: 2, config: { maxLength: 1000 },
    value: "Lesson plans shared with the teaching team." },
];
const templates: TemplateDetail[] = ["Đơn xin nghỉ phép", "Đề nghị mua thiết bị", "Đăng ký đào tạo"].map((name, index) => ({
  id: index === 0 ? "leave" : "template-" + index, name, description: "Gửi yêu cầu để trưởng nhóm và nhân sự phê duyệt.",
  collectionId: "staff", collectionName: "Nhân sự", campusNames: ["Cơ sở Trung tâm"],
  templateType: "RequestForm", deactivate: false, isPublished: true, createdDate: timestamp, updatedAt: timestamp,
  fields: fields.map(({ value: _value, ...field }) => { void _value; return field; }),
  expirationCycle: 48,
  campus: [{ id: "campus-link", campusId: "central", campusName: "Cơ sở Trung tâm" }],
  groups: [{ id: "group-link", groupId: "teachers", groupName: "Giáo viên" }],
  watchers: [{ id: "watcher-link", userId: user.id, fullName: user.fullName, email: user.email }],
}));
const processes: ProcessStepDto[] = ["Trưởng nhóm duyệt", "Nhân sự xác nhận", "Hoàn tất hồ sơ"].map((processName, index) => ({
  id: "step-" + (index + 1), templateId: "leave", processName, processOrder: index + 1,
  processStatus: 1, typeApprovalId: 1, description: "Kiểm tra thông tin và xác nhận lịch nghỉ.",
  approvers: [{ id: "approver-" + index, kind: "User", resourceId: user.id, resourceName: user.fullName }],
}));
const requests: RequestListItem[] = ["Nghỉ phép ngày 24–25/11", "Mua màn hình phòng giáo viên", "Đăng ký khóa đào tạo"].map((subject, index) => ({
  id: "request-" + (index + 1), subject, templateId: templates[index].id, templateName: templates[index].name,
  collectionId: "staff", collectionName: "Nhân sự", formStatus: index === 2 ? 3 : 2,
  createdById: user.id, createdByName: user.fullName, createdDate: timestamp,
  expiredDate: "2030-12-31T08:00:00Z", updatedAt: timestamp, isArchived: false,
  currentStepName: processes[0].processName, currentStepIndex: 0, canApprove: index < 2,
}));
const detail: RequestDetail = {
  ...requests[0], fields, watchers: [{ userId: user.id, fullName: user.fullName, email: user.email }],
  processes: processes.map((process, index) => ({
    ...process, processStatus: index === 0 ? 2 : 1, processAction: 0,
    stageStatus: index === 0 ? 1 : null, needToDo: index === 0, approvers: [user],
    worklogTemplateId: index === 0 ? "review-note" : null,
  })),
  currentWorkflowId: "workflow-1", canAssign: true, needToDo: true, worklogFilled: true,
  resolvedApprovers: [user],
};

async function mockForms(page: Page) {
  await mockGeeo(page);
  await page.route("https://auth.geeo.test/connect/userinfo", route => route.fulfill({ json: {
    ...mockUser, permission: ["forms.request.read", "forms.request.write", "forms.template.read", "forms.template.write", "forms.template.admin"],
  }, headers: { "access-control-allow-origin": "*" } }));
  const unexpected: string[] = [];
  await page.route("https://api.geeo.test/**", async route => {
    const { pathname } = new URL(route.request().url());
    const method = route.request().method();
    const headers = {
      "access-control-allow-origin": "*", "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
    };
    if (method === "OPTIONS") { await route.fulfill({ status: 204, headers }); return; }
    const runtime = "/api/v2/forms/requests";
    const builder = "/api/v2/form-builder";
    const paged = (items: unknown[]) => ({ items, page: 1, pageSize: 25, total: items.length, hasNext: false });
    let json: unknown;
    if (method === "POST" && pathname === runtime + "/query") json = paged(requests);
    else if (method === "POST" && pathname === runtime + "/query/counts") json = { action: 2, created: 3, viewer: 3 };
    else if (method === "POST" && pathname === runtime + "/request-1/open") json = { updatedAt: timestamp };
    else if (method === "GET") {
      if (pathname === runtime + "/request-1") json = detail;
      else if (pathname === runtime + "/request-1/comments") json = [{
        id: "comment-1", userId: user.id, fullName: user.fullName, content: "Đã bàn giao lịch giảng dạy cho nhóm.",
        rootId: null, attachments: [], createdDate: timestamp,
      }];
      else if (pathname === runtime + "/request-1/activities") json = [{
        id: "activity-1", userId: user.id, fullName: user.fullName, formStatus: 2,
        note: "Yêu cầu đã được gửi đến trưởng nhóm.", createdDate: timestamp,
      }];
      else if (pathname === runtime + "/request-1/worklogs") json = [];
      else if (pathname === runtime + "/request-1/worklog-step/step-1") json = {
        id: "review-note", name: "Xác nhận lịch nghỉ", description: "Ghi nhận kết quả kiểm tra.",
        fields: [{ ...fields[0], id: "review", inputKey: "review", fieldName: "review", label: "Ghi chú xét duyệt", required: false, value: "" }],
      };
      else if (pathname === runtime + "/templates/available") json = templates.map(template => ({ ...template, expirationCycle: 48 }));
      else if (pathname === runtime + "/templates/leave/for-submit") json = templates[0];
      else if (pathname === builder + "/collections") json = [{
        id: "staff", name: "Nhân sự", description: "Yêu cầu dành cho giáo viên và nhân viên", active: true, templateCount: 3,
      }];
      else if (pathname === builder + "/templates") json = { result: paged(templates) };
      else if (pathname === builder + "/templates/leave") json = templates[0];
      else if (pathname === builder + "/processes") json = processes;
      else if (pathname === builder + "/worklog-templates/published") json = [];
      else if (pathname === builder + "/lookups/campuses") json = [{ id: "central", name: "Cơ sở Trung tâm", active: true, address: null }];
      else if (pathname === builder + "/lookups/groups") json = [{ id: "teachers", name: "Giáo viên", description: null }];
      else if (pathname === builder + "/lookups/users") json = [{ ...user, userName: user.email }];
      else if (pathname === builder + "/lookups/function-types") json = [];
      else if (pathname === builder + "/processes/step-1") json = processes[0];
      else if (pathname === builder + "/processes/step-1/api-config") json = [];
      else if (/\/processes\/step-[123]\/approver-preview$/.test(pathname)) json = {
        processId: pathname.split("/").at(-2), typeApprovalId: 1, typeLabel: "User",
        resourceName: user.fullName, users: [user], totalCount: 1,
      };
      else if (pathname === builder + "/processes/step-1/triggers") json = [{
        id: "notify-hr", processId: "step-1", processAction: "APPROVED", triggerName: "Thông báo nhân sự",
        apiUrl: "https://hooks.example.test/leave-approved", httpMethod: "POST", parameters: [],
        headers: [], payloadTemplate: '{"reason":"{{reason}}"}', isConditionTrigger: false, conditionExpression: null,
      }];
    }
    if (json === undefined) {
      unexpected.push(method + " " + pathname);
      await route.fulfill({ status: 501, headers, json: { title: "Unmocked Forms endpoint", detail: pathname } });
    } else await route.fulfill({ headers, json });
  });
  return unexpected;
}

async function launch(page: Page, appId: string) {
  await page.locator(".os-dock").getByRole("button", { name: "Tất cả ứng dụng", exact: true }).click();
  const launcher = page.getByRole("dialog", { name: "Tất cả ứng dụng", exact: true });
  await launcher.locator('[role="option"][id$="-' + appId + '"]').click();
  const panel = page.locator('[data-app="' + appId + '"]');
  await expect(panel).toBeVisible();
  await panel.locator(".os-light-max").click();
  return panel;
}

async function screenshot(page: Page, panel: Locator, name: string) {
  await expect(panel.locator(".lms-ui")).toBeVisible();
  await page.screenshot({ path: join(homedir(), "screens", name + ".png"), fullPage: true, animations: "disabled" });
}

test("Requests and Form Templates render inside desktop windows", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Forms desktop-window acceptance");
  test.setTimeout(90_000);
  const unexpected = await mockForms(page);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await seedGeeo(page.context());
  await mkdir(join(homedir(), "screens"), { recursive: true });
  await page.goto("/");
  await expect(page.locator(".geeospace-os")).toHaveAttribute("data-ready", "true");
  await expect(page.locator(".os-account-chip")).toContainText(mockUser.name);
  const requestPanel = await launch(page, "requests");
  await expect(requestPanel.getByText(requests[0].subject, { exact: true })).toBeVisible();
  await expect(requestPanel.getByText(requests[1].subject, { exact: true })).toBeVisible();
  await screenshot(page, requestPanel, "requests-inbox");
  await requestPanel.getByText(requests[0].subject, { exact: true }).click();
  await expect(page).toHaveURL(/#requests\/request-1$/);
  await expect(requestPanel.getByText(requests[0].subject, { exact: true })).toBeVisible();
  await expect(requestPanel.getByText(processes[0].processName, { exact: true }).first()).toBeVisible();
  await expect(requestPanel.getByText("Family appointment", { exact: true })).toBeVisible();
  await screenshot(page, requestPanel, "request-detail");
  await requestPanel.getByRole("link", { name: "Requests", exact: true }).click();
  await requestPanel.getByRole("button", { name: "New Request", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Đơn xin nghỉ phép/ }).click();
  await expect(requestPanel.getByLabel("Request Subject")).toBeVisible();
  await expect(requestPanel.getByLabel("Lý do nghỉ phép", { exact: false })).toBeVisible();
  await expect(page).toHaveURL(/#requests\/new\/leave$/);
  await expect(requestPanel.getByRole("button", { name: "Submit Request", exact: true })).toBeInViewport({ ratio: 0.99 });
  await screenshot(page, requestPanel, "request-submit");
  await requestPanel.locator(".os-light-min").click();

  const templatePanel = await launch(page, "lms-form-templates");
  await expect(templatePanel.getByRole("cell", { name: templates[0].name, exact: true })).toBeVisible();
  await screenshot(page, templatePanel, "form-templates-list");
  await templatePanel.getByRole("cell", { name: templates[0].name, exact: true }).click();
  await templatePanel.getByRole("button", { name: "Chỉnh sửa", exact: true }).click();
  await expect(templatePanel.getByPlaceholder("Tiêu đề biểu mẫu")).toHaveValue(templates[0].name);
  await expect(templatePanel.getByText("Lý do nghỉ phép", { exact: true }).first()).toBeVisible();
  await expect(templatePanel.getByRole("button", { name: "Lưu", exact: true })).toBeInViewport({ ratio: 0.99 });
  await expect(templatePanel.getByRole("button", { name: "Hủy", exact: true })).toBeInViewport({ ratio: 0.99 });
  await screenshot(page, templatePanel, "form-template-builder");
  await templatePanel.getByRole("button", { name: "Hủy", exact: true }).first().click();
  await templatePanel.getByRole("button", { name: "Workflow", exact: true }).click();
  await expect(templatePanel.locator(".react-flow__pane")).toBeVisible();
  await expect(templatePanel.locator(".react-flow__node-approval-step-node")).toHaveCount(3);
  await expect(templatePanel.locator(".react-flow__node").filter({ hasText: processes[0].processName })).toBeVisible();
  await expect(templatePanel.locator(".react-flow__node-start-node")).toBeInViewport({ ratio: 0.99 });
  await expect(templatePanel.locator(".react-flow__node-end-node")).toBeInViewport({ ratio: 0.99 });
  await expect(templatePanel.locator(".react-flow__controls")).toBeInViewport({ ratio: 0.99 });
  await screenshot(page, templatePanel, "workflow-editor");
  await templatePanel.getByRole("button", { name: /Trưởng nhóm duyệt/ }).first().click();
  await templatePanel.getByRole("button", { name: "Triggers", exact: true }).click();
  await expect(templatePanel.getByText("Thông báo nhân sự", { exact: true })).toBeVisible();
  await screenshot(page, templatePanel, "triggers");
  expect(unexpected, "Every Forms API call must have an explicit fixture").toEqual([]);
  expect(errors, "Panels should not throw client runtime errors").toEqual([]);
});
