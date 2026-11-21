import { PERMISSIONS } from "@/lib/permissions"

export type FormTemplatesRoute =
  | { screen: "list" | "new" | "collections" | "worklogs" | "worklog-new" | "not-found" }
  | { screen: "detail" | "edit" | "workflow" | "api" | "worklog-detail" | "worklog-edit"; id: string }
  | { screen: "triggers"; id: string; stepId: string }

export function resolveFormTemplatesRoute(path: string): FormTemplatesRoute {
  const clean = path.split("?")[0].replace(/^\/+|\/+$/g, "")
  const parts = clean ? clean.split("/") : []
  try {
    for (let index = 0; index < parts.length; index++) {
      parts[index] = decodeURIComponent(parts[index])
      if (!parts[index] || /[/\\]/.test(parts[index]) || parts[index] === "." || parts[index] === "..") {
        return { screen: "not-found" }
      }
    }
  } catch { return { screen: "not-found" } }
  if (!parts.length) return { screen: "list" }
  if (parts[0] === "new") return { screen: parts.length === 1 ? "new" : "not-found" }
  if (parts[0] === "collections") return { screen: parts.length === 1 ? "collections" : "not-found" }
  if (parts[0] === "worklog-templates") {
    if (parts.length === 1) return { screen: "worklogs" }
    if (parts[1] === "new") return { screen: parts.length === 2 ? "worklog-new" : "not-found" }
    if (parts.length === 2) return { screen: "worklog-detail", id: parts[1] }
    if (parts.length === 3 && parts[2] === "edit") return { screen: "worklog-edit", id: parts[1] }
    return { screen: "not-found" }
  }
  const [id, mode, stepId, end] = parts
  if (parts.length === 1) return { screen: "detail", id }
  if (parts.length === 2 && (mode === "edit" || mode === "workflow" || mode === "api")) {
    return { screen: mode, id }
  }
  if (parts.length === 4 && mode === "workflow" && end === "triggers") {
    return { screen: "triggers", id, stepId }
  }
  return { screen: "not-found" }
}

export function formTemplatesRoutePermission(route: FormTemplatesRoute) {
  return ["new", "edit", "collections", "workflow", "triggers", "worklog-new", "worklog-edit"].includes(route.screen)
    ? PERMISSIONS.FORMS_TEMPLATE_WRITE
    : PERMISSIONS.FORMS_TEMPLATE_READ
}
