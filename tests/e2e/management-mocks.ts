import { expect, type Page } from "@playwright/test";
import { PERMISSIONS } from "../../lib/permissions";
import { mockGeeo, mockUser, seedGeeo } from "./geeo-mocks";

export const managementPermissions = [
  PERMISSIONS.ADMIN_USERS_READ,
  PERMISSIONS.ADMIN_USERS_MANAGE,
  PERMISSIONS.ADMIN_ROLES_MANAGE,
  PERMISSIONS.ADMIN_FACILITIES_READ,
  PERMISSIONS.ADMIN_FACILITIES_MANAGE,
];

const campus = { id: "north", name: "North Campus", address: "North Learning Center", fullAddress: "18 Oak Street", location: null, website: null, image: null, ipAddress: null };
const south = { ...campus, id: "south", name: "South Campus", address: "South Learning Center", fullAddress: "77 Cedar Avenue" };
const roomType = { id: "standard", name: "Standard Classroom" };
const teacher = { id: "role-teacher", name: "Teacher", userCount: 1, permissionCount: 1 };
const planner = { id: "role-planner", name: "Planner", userCount: 1, permissionCount: 0 };
const routes = {
  users: "/api/v2/users/Users",
  roles: "/api/v2/admin/Roles",
  branches: "/api/v2/admin/Branches",
  rooms: "/api/v2/admin/Rooms",
  lookups: "/api/v2/lookups/Lookups",
};

function paged<T>(items: T[]) {
  return { items, page: 1, pageSize: 100, total: items.length, hasNext: false };
}

export async function mockManagement(page: Page, permissions = managementPermissions) {
  const requests: Array<{ path: string; method: string; body: unknown }> = [];
  const state = { usersStatus: 200, usersPageSize: 100, roomsStatus: 200 };
  let sequence = 0;
  const users = [
    { id: "mai", fullName: "Mai Nguyen", email: "mai@example.test", roleName: "Teacher", branch: campus.name, isActive: true, assignedCampus: '["north"]', avatarImage: "profile.png", degreeCertificate: "degree.pdf" },
    { id: "linh", fullName: "Linh Tran", email: "linh@example.test", roleName: "Planner", branch: south.name, isActive: false, assignedCampus: '["south"]' },
  ];
  const roles = [teacher, planner];
  const roleClaims = new Map([
    [teacher.id, [{ claimId: "initial-claim", claimType: "permission", claimValue: PERMISSIONS.CLASS_READ as string }]],
    [planner.id, []],
  ]);
  const branches = [campus, south];
  const rooms = [
    { id: "lotus", name: "Lotus Room", roomNumber: "101", campusId: "north", roomTypeId: roomType.id, roomType },
    { id: "orchid", name: "Orchid Room", roomNumber: "G02", campusId: "south", roomTypeId: roomType.id, roomType },
  ];
  await mockGeeo(page, { ...mockUser, name: "LMS Admin", permission: permissions });
  await seedGeeo(page.context());

  await page.route("https://api.geeo.test/api/v2/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    const headers = { "access-control-allow-origin": "*", "access-control-allow-methods": "*", "access-control-allow-headers": "*" };
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers });
    expect(request.headers().authorization).toBe("Bearer mock-access");
    const body = request.postDataJSON();
    requests.push({ path, method, body });
    const json = (data: unknown, status = 200) => route.fulfill({ headers, json: data, status });
    const empty = () => route.fulfill({ headers, status: 204 });
    const id = path.split("/").at(-1);

    if (path === routes.users + "/query") {
      if (state.usersStatus !== 200) return json({ title: "Unavailable" }, state.usersStatus);
      const page: number = body.page;
      const pageSize = state.usersPageSize;
      return json({ items: users.slice((page - 1) * pageSize, page * pageSize), total: users.length, page, pageSize, hasNext: page * pageSize < users.length });
    }
    if (path === routes.lookups + "/roles") return json(roles);
    if (path === routes.lookups + "/campuses") return json(branches);
    if (path.startsWith(routes.users + "/")) {
      const user = users.find(entry => entry.id === path.split("/")[5]);
      if (!user) return json({ title: "User not found" }, 404);
      if (method === "PATCH" && id === "status") {
        user.isActive = body.isActive;
        return empty();
      }
      if (method === "PUT" && id === "role") {
        user.roleName = roles.find(role => role.id === body.roleId)?.name ?? "";
        user.assignedCampus = JSON.stringify(body.assignedCampusIds);
        user.branch = branches.filter(branch => body.assignedCampusIds.includes(branch.id)).map(branch => branch.name).join(", ");
        return empty();
      }
      if (id === "profile.png") {
        const pixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSXsAAAAASUVORK5CYII=", "base64");
        return route.fulfill({ headers, contentType: "image/png", body: pixel });
      }
      if (id === "degree.pdf") {
        return route.fulfill({ headers, contentType: "application/pdf", body: "%PDF-1.4" });
      }
      return json(user);
    }

    if (path === routes.roles) return json(paged(roles.map(role => ({ ...role, permissionCount: roleClaims.get(role.id)?.length ?? 0 }))));
    if (path.startsWith(routes.roles + "/")) {
      const role = roles.find(entry => entry.id === path.split("/")[5]);
      if (!role) return json({ title: "Role not found" }, 404);
      const permissions = roleClaims.get(role.id)!;
      if (method === "POST") {
        permissions.push({ claimId: "new-claim", claimType: body.claimType, claimValue: body.claimValue });
        return empty();
      }
      if (method === "DELETE") {
        roleClaims.set(role.id, permissions.filter(claim => claim.claimId !== id));
        return empty();
      }
      return json({ ...role, permissionCount: permissions.length, permissions });
    }

    if (path === routes.branches + "/query") return json(paged(branches));
    if (path === routes.rooms + "/query") {
      return state.roomsStatus === 200 ? json(paged(rooms)) : json({ title: "Unavailable" }, state.roomsStatus);
    }
    if (path === routes.rooms + "/room-types") return json([roomType]);
    const collection = path.startsWith(routes.branches + "/") ? branches : path.startsWith(routes.rooms + "/") ? rooms : undefined;
    if (collection) {
      if (method === "POST" && id === "create") {
        const entry = { ...body, id: `new-${++sequence}`, roomType: body.roomTypeId ? roomType : null };
        collection.push(entry);
        return json(entry, 201);
      }
      const index = collection.findIndex(entry => entry.id === id);
      if (index === -1) return json({ title: "Not found" }, 404);
      if (method === "DELETE") {
        collection.splice(index, 1);
        return empty();
      }
      if (method === "PUT") {
        Object.assign(collection[index], body);
        return empty();
      }
      return json(collection[index]);
    }
    return json({ title: "Unmocked API request" }, 404);
  });
  return { requests, state, routes };
}
