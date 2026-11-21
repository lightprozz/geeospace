import { appEnglish } from "./locale";
import { modules } from "@/lib/platform/modules";

export const appGroups = [
  { id: "workspace", label: "Không gian làm việc", english: "Workspace" },
  { id: "lms", label: "Gee-O LMS", english: "Gee-O LMS" },
  { id: "staff", label: "Công việc", english: "Work" },
  { id: "admin", label: "Quản trị", english: "Administration" },
] as const;
export type AppGroupId = (typeof appGroups)[number]["id"];
export const lmsApps = [
  { id: "lms-curriculum", group: "lms", label: "Giáo trình", english: ["Levels & Lessons", "Manage levels & lessons in Gee-O LMS."], description: "Quản lý giáo trình trong Gee-O LMS.", icon: "book" },
  { id: "lms-materials", group: "lms", label: "Học liệu", english: ["Materials", "Manage materials in Gee-O LMS."], description: "Quản lý học liệu trong Gee-O LMS.", icon: "book" },
  { id: "lms-students", group: "lms", label: "Học viên", english: ["Students", "Manage students in Gee-O LMS."], description: "Quản lý học viên trong Gee-O LMS.", icon: "user" },
  { id: "lms-classes", group: "lms", label: "Lớp học", english: ["Classes", "Manage classes in Gee-O LMS."], description: "Quản lý lớp học trong Gee-O LMS.", icon: "school" },
  { id: "lms-schedule", group: "lms", label: "Lịch học", english: ["Schedule", "Manage schedule in Gee-O LMS."], description: "Quản lý lịch học trong Gee-O LMS.", icon: "calendar" },
  { id: "lms-timetable", group: "lms", label: "Thời khóa biểu", english: ["Timetable", "Manage timetable in Gee-O LMS."], description: "Quản lý thời khóa biểu trong Gee-O LMS.", icon: "calendar" },
  { id: "lms-attendance", group: "lms", label: "Điểm danh", english: ["Attendance", "Manage attendance in Gee-O LMS."], description: "Quản lý điểm danh trong Gee-O LMS.", icon: "user" },
  { id: "lms-holidays", group: "lms", label: "Ngày nghỉ", english: ["Holidays", "Manage holidays in Gee-O LMS."], description: "Quản lý ngày nghỉ trong Gee-O LMS.", icon: "calendar" },
  { id: "lms-users", group: "admin", label: "Người dùng", english: ["Users", "Manage users and access."], description: "Quản lý người dùng.", icon: "user" },
  { id: "lms-roles", group: "admin", label: "Vai trò", english: ["Roles", "Manage roles and access."], description: "Quản lý vai trò.", icon: "user" },
  { id: "lms-branches", group: "lms", label: "Chi nhánh", english: ["Branches", "Manage branches in Gee-O LMS."], description: "Quản lý chi nhánh trong Gee-O LMS.", icon: "home" },
  { id: "lms-worklog", group: "staff", label: "Nhật ký công việc", english: ["Worklog", "Manage worklogs."], description: "Quản lý nhật ký công việc.", icon: "clock" },
  { id: "lms-form-templates", group: "staff", label: "Biểu mẫu", english: ["Form templates", "Manage request form templates."], description: "Quản lý biểu mẫu.", icon: "book" },
  { id: "lms-lets-learn", group: "lms", label: "Cùng học", english: ["Let's Learn", "Manage let's learn in Gee-O LMS."], description: "Quản lý cùng học trong Gee-O LMS.", icon: "school" },
] as const;
export const desktopApps = [
  ...modules.map(app => ({ ...app, group: app.id === "work" || app.id === "requests" ? "staff" as const : "workspace" as const })),
  { id: "lms", group: "lms", label: "Gee-O LMS", description: "Các ứng dụng quản lý và giảng dạy.", icon: "school" },
  { id: "staff", group: "staff", label: "Công việc", english: ["Work", "Requests, worklogs and payroll."], description: "Yêu cầu, nhật ký công việc và bảng lương.", icon: "clock" },
  { id: "admin", group: "admin", label: "Quản trị", english: ["Administration", "Users and roles."], description: "Quản lý người dùng và vai trò.", icon: "user" },
  { id: "account", group: "workspace", label: "Tài khoản", description: "Trạng thái kết nối Gee-O Auth.", icon: "user" },
  { id: "appearance", group: "workspace", label: "Giao diện", description: "Hình nền, chế độ màu và độ trong suốt.", icon: "palette" },
  ...lmsApps,
] as const;
export type DesktopAppId = (typeof desktopApps)[number]["id"];
export function isGroupHub(id: DesktopAppId) { return appGroups.some(group => group.id !== "workspace" && group.id === id); }
export const dockApps = desktopApps.filter(app => app.id !== "appearance" && (app.group === "workspace" || isGroupHub(app.id)));
export function appsInGroup(group: AppGroupId) { return desktopApps.filter(app => app.group === group); }
export function isDesktopApp(value: unknown): value is DesktopAppId {
  return typeof value === "string" && desktopApps.some((app) => app.id === value);
}
export function appDefinition(id: DesktopAppId) {
  return desktopApps.find((app) => app.id === id)!;
}
export function searchApps(query: string) {
  const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replaceAll("đ", "d").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return desktopApps.map((app) => {
    const group = appGroups.find(group => group.id === app.group)!;
    const english = "english" in app ? app.english : appEnglish[app.id];
    const text = normalize(`${app.label} ${app.description} ${english.join(" ")}`);
    const groupedText = `${text} ${normalize(`${group.label} ${group.english}`)}`;
    const relevance = words.every(word => text.includes(word)) ? 2 : words.every(word => groupedText.includes(word)) ? 1 : 0;
    return { app, relevance };
  }).filter(result => result.relevance > 0).sort((a, b) => b.relevance - a.relevance).map(result => result.app);
}
