import { expect, test } from "@playwright/test";
import { PERMISSIONS } from "../../lib/permissions";
import { authBaseURL, mockGeeo } from "./geeo-mocks";
import { mockManagement } from "./management-mocks";

test.use({ baseURL: authBaseURL });
test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "desktop", "Desktop management acceptance");
});

test("users: filter, view a profile, assign a campus and deactivate", async ({ page }) => {
  const { requests, routes } = await mockManagement(page);
  await page.goto("/#lms-users");
  const panel = page.locator('[data-app="lms-users"]');
  const row = panel.getByRole("row").filter({ hasText: "mai@example.test" });
  await expect(row).toBeVisible();
  await panel.getByRole("textbox", { name: "Search users" }).fill("missing");
  await expect(panel.getByText("No users found")).toBeVisible();
  await panel.getByRole("textbox", { name: "Search users" }).fill("mai@example.test");
  await row.getByRole("button", { name: "Mai Nguyen", exact: true }).click();
  const info = page.getByRole("dialog", { name: "User Information" });
  await expect(info.getByText("Mai Nguyen")).toBeVisible();
  await expect(info.getByText("Active", { exact: true })).toBeVisible();
  await expect(info.getByText("North Campus", { exact: true })).toBeVisible();
  await expect(info.getByRole("img", { name: "Mai Nguyen" })).toBeVisible();
  const download = page.waitForEvent("download");
  await info.getByRole("button", { name: "degree.pdf" }).click();
  expect((await download).suggestedFilename()).toBe("degree.pdf");
  await info.getByRole("button", { name: "Close" }).click();

  await row.getByRole("button", { name: "Actions for Mai Nguyen" }).click();
  await page.getByRole("menuitem", { name: "Edit Role" }).click();
  const assignment = page.getByRole("dialog", { name: "Edit Role & Campus" });
  await expect(assignment.getByRole("checkbox", { name: "North Campus" })).toBeChecked();
  await assignment.getByRole("checkbox", { name: "South Campus" }).check();
  await assignment.getByRole("button", { name: "Save Changes" }).click();
  await expect(assignment).toBeHidden();
  await expect(page.locator("body")).not.toHaveCSS("pointer-events", "none");
  await expect(row).toContainText("South Campus");
  expect(requests).toContainEqual({ path: `${routes.users}/mai/role`, method: "PUT", body: { roleId: "role-teacher", assignedCampusIds: ["north", "south"] } });

  await row.getByRole("button", { name: "Actions for Mai Nguyen" }).click();
  await page.getByRole("menuitem", { name: "Deactivate" }).click();
  await expect(row).toBeHidden();
  await panel.getByRole("tab", { name: "Inactive", exact: true }).click();
  await expect(row).toBeVisible();
  expect(requests).toContainEqual({ path: `${routes.users}/mai/status`, method: "PATCH", body: { isActive: false } });
});

test("users: finds accounts from later API pages", async ({ page }) => {
  const { requests, routes, state } = await mockManagement(page);
  state.usersPageSize = 1;
  await page.goto("/#lms-users");
  const panel = page.locator('[data-app="lms-users"]');
  await panel.getByRole("tab", { name: "Inactive", exact: true }).click();
  await panel.getByRole("textbox", { name: "Search users" }).fill("linh@example.test");
  await expect(panel.getByRole("row").filter({ hasText: "linh@example.test" })).toBeVisible();
  expect(requests.filter(request => request.path === routes.users + "/query").map(request => request.body))
    .toEqual([expect.objectContaining({ page: 1 }), expect.objectContaining({ page: 2 })]);
});

test("users: displays and sorts by the API's English names without shortening full names", async ({ page }) => {
  const { users } = await mockManagement(page);
  users[1].isActive = true;
  await page.goto("/#lms-users");
  const panel = page.locator('[data-app="lms-users"]');
  const rows = panel.locator("tbody tr");
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("Linh Tran");
  await panel.getByRole("button", { name: "English Name" }).click();
  await expect(rows.first()).toContainText("Mai Nguyen");
  await expect(rows.first().getByRole("cell", { name: "Amy", exact: true })).toBeVisible();
  await expect(rows.last().getByRole("cell", { name: "Zoe", exact: true })).toBeVisible();
});

test("users: filters by whole campus name across multi-campus assignments", async ({ page }) => {
  const { users } = await mockManagement(page);
  users[0].branch = "South Campus, North Campus";
  users[1].branch = "North Campus Annex";
  users[1].isActive = true;
  await page.goto("/#lms-users");
  const panel = page.locator('[data-app="lms-users"]');
  const rows = panel.locator("tbody tr");
  await expect(rows).toHaveCount(2);
  await panel.getByRole("combobox", { name: "Filter by branch" }).click();
  await page.getByRole("option", { name: "North Campus", exact: true }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Mai Nguyen");
});

test("users: toggles a column sort from the keyboard and announces its direction", async ({ page }) => {
  const { users } = await mockManagement(page);
  users[1].isActive = true;
  await page.goto("/#lms-users");
  const panel = page.locator('[data-app="lms-users"]');
  await expect(panel.getByRole("columnheader", { name: "Full Name" })).toHaveAttribute("aria-sort", "ascending");
  const header = panel.getByRole("columnheader", { name: "Email", exact: true });
  const sortButton = header.getByRole("button", { name: "Email", exact: true });
  await sortButton.focus();
  await page.keyboard.press("Enter");
  await expect(header).toHaveAttribute("aria-sort", "ascending");
  await expect(panel.locator("tbody tr").first()).toContainText("linh@example.test");
  await page.keyboard.press("Space");
  await expect(header).toHaveAttribute("aria-sort", "descending");
  await expect(panel.locator("tbody tr").first()).toContainText("mai@example.test");
});

test("roles: filter, grant and revoke a permission on the selected role", async ({ page }) => {
  const { requests, routes } = await mockManagement(page);
  await page.goto("/#lms-roles");
  const panel = page.locator('[data-app="lms-roles"]');
  await panel.getByRole("button", { name: /Planner/ }).click();
  await panel.getByRole("textbox", { name: "Search permissions" }).fill("class.read");
  const claim = panel.getByRole("switch", { name: "class.read", exact: true });
  await expect(claim).not.toBeChecked();
  await claim.click();
  await expect(claim).toBeChecked();
  await panel.getByRole("button", { name: "Claimed Only" }).click();
  await expect(claim).toBeVisible();
  await claim.click();
  await expect(panel.getByText("No permissions found")).toBeVisible();
  expect(requests).toContainEqual({ path: `${routes.roles}/role-planner/permissions`, method: "POST", body: { claimType: "permission", claimValue: "class.read" } });
  expect(requests).toContainEqual({ path: `${routes.roles}/role-planner/permissions/new-claim`, method: "DELETE", body: null });
});

test("branches: filter a branch and create, edit and remove a classroom", async ({ page }) => {
  const { requests, routes } = await mockManagement(page);
  await page.goto("/#lms-branches");
  const panel = page.locator('[data-app="lms-branches"]');
  await panel.getByRole("searchbox", { name: "Filter branches" }).fill("North");
  await panel.getByRole("button", { name: "View Rooms" }).click();
  await expect(panel.getByText("Lotus Room")).toBeVisible();
  await expect(panel.getByText("Orchid Room")).toHaveCount(0);
  await panel.getByRole("button", { name: "Add Room" }).click();
  const room = page.getByRole("dialog", { name: "Add New Room" });
  await room.getByLabel("Room Name").fill("Maple Room");
  await room.getByLabel("Room Number").fill("104");
  await room.getByRole("combobox", { name: "Room Type" }).click();
  await page.getByRole("option", { name: "Standard Classroom" }).click();
  await room.getByRole("button", { name: "Add Room" }).click();
  const row = panel.getByRole("row").filter({ hasText: "Maple Room" });
  await expect(row).toBeVisible();
  expect(requests).toContainEqual({ path: `${routes.rooms}/create`, method: "POST", body: { name: "Maple Room", campusId: "north", roomNumber: "104", roomTypeId: "standard" } });
  await row.getByRole("button", { name: "Edit room" }).click();
  const edit = page.getByRole("dialog", { name: "Edit Room" });
  await edit.getByLabel("Room Number").fill("105");
  await edit.getByRole("button", { name: "Save Changes" }).click();
  await expect(row).toContainText("105");
  await row.getByRole("button", { name: "Delete room" }).click();
  await page.getByRole("alertdialog", { name: "Delete Room" }).getByRole("button", { name: "Delete", exact: true }).click();
  await expect(row).toHaveCount(0);
});

test("branches: create, edit and delete a branch after confirmation", async ({ page }) => {
  await mockManagement(page);
  await page.goto("/#lms-branches");
  const panel = page.locator('[data-app="lms-branches"]');
  await panel.getByRole("button", { name: "Add Branch" }).click();
  const create = page.getByRole("dialog", { name: "Create New Branch" });
  await create.getByLabel("Short Name").fill("West Campus");
  await create.getByLabel("Full Name").fill("West Learning Center");
  await create.getByLabel("Physical Address").fill("15 Park Avenue");
  await create.getByRole("button", { name: "Create Branch" }).click();
  await panel.getByRole("searchbox", { name: "Filter branches" }).fill("West");
  await expect(panel.getByText("15 Park Avenue")).toBeVisible();
  await panel.getByRole("button", { name: "Branch options" }).click();
  await page.getByRole("menuitem", { name: "Edit Branch" }).click();
  const edit = page.getByRole("dialog", { name: "Edit Branch" });
  await edit.getByLabel("Physical Address").fill("16 Park Avenue");
  await edit.getByRole("button", { name: "Save Changes" }).click();
  await expect(panel.getByText("16 Park Avenue")).toBeVisible();
  await panel.getByRole("button", { name: "Branch options" }).click();
  await page.getByRole("menuitem", { name: "Delete Branch" }).click();
  const confirmation = page.getByRole("alertdialog", { name: "Delete Branch" });
  await expect(confirmation).toContainText("West Campus");
  await confirmation.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(panel.getByText("No branches match filter")).toBeVisible();
});

test("read-only users can browse but cannot open protected management actions", async ({ page }) => {
  const { requests, routes } = await mockManagement(page, [PERMISSIONS.ADMIN_USERS_READ, PERMISSIONS.ADMIN_FACILITIES_READ]);
  await page.goto("/#lms-users");
  await expect(page.getByText("mai@example.test")).toBeVisible();
  await expect(page.getByRole("button", { name: /Actions for/ })).toHaveCount(0);
  await page.goto("/#lms-roles");
  await expect(page.getByText("Bạn chưa có quyền xem nội dung này.")).toBeVisible();
  expect(requests.some(request => request.path === routes.roles)).toBe(false);
  await page.goto("/#lms-branches");
  await expect(page.getByText("North Campus", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Branch" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Branch options" })).toHaveCount(0);
});

test("failed user reads are retryable and never appear as an empty list", async ({ page }) => {
  const { state } = await mockManagement(page);
  state.usersStatus = 503;
  await page.goto("/#lms-users");
  const alert = page.getByRole("alert").filter({ hasText: "Could not load users." });
  await expect(alert).toBeVisible();
  await expect(page.getByText("No users found")).toHaveCount(0);
  state.usersStatus = 200;
  await alert.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("mai@example.test")).toBeVisible();
});

test("signed-out users see the sign-in gate before any management data", async ({ page }) => {
  await mockGeeo(page);
  await page.goto("/#lms-users");
  await expect(page.getByRole("heading", { name: "Đăng nhập Gee-O để dùng LMS" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Users Management" })).toHaveCount(0);
});
