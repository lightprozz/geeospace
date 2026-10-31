import type { DesktopAppId } from "./apps";
export type Locale = "vi" | "en";
export const appEnglish: Record<DesktopAppId, [string, string]> = {
  today: ["Today", "Your next sessions and actions."], calendar: ["Schedule", "Your schedule and permitted branch calendars."],
  requests: ["My requests", "Submit, follow and act on your requests."], learning: ["Self-learning", "Assigned and elective courses, and learning progress."],
  work: ["Work & pay", "Reconcile worklogs, working time and published payslips."], notifications: ["Notices", "Updates for you and your centre."],
  assistant: ["Assistant", "Find and open the right feature."], lms: ["Classes & teaching", "Open Gee-O LMS within your permissions."],
  account: ["Account", "Gee-O Auth connection status."], appearance: ["Appearance", "Wallpaper, colour and transparency."],
};
