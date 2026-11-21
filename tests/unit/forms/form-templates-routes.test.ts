import { describe, expect, it } from "vitest"
import { formTemplatesRoutePermission, resolveFormTemplatesRoute } from "@/features/forms/form-templates/routes"
import { PERMISSIONS } from "@/lib/permissions"

describe("Form Templates window routes", () => {
  it.each([
    ["", { screen: "list" }],
    ["/?collection=one", { screen: "list" }],
    ["new", { screen: "new" }],
    ["collections/", { screen: "collections" }],
    ["template-1", { screen: "detail", id: "template-1" }],
    ["template-1/edit", { screen: "edit", id: "template-1" }],
    ["template-1/workflow", { screen: "workflow", id: "template-1" }],
    ["template-1/workflow/step-2/triggers", { screen: "triggers", id: "template-1", stepId: "step-2" }],
    ["template-1/api", { screen: "api", id: "template-1" }],
    ["worklog-templates", { screen: "worklogs" }],
    ["worklog-templates/new", { screen: "worklog-new" }],
    ["worklog-templates/template-1", { screen: "worklog-detail", id: "template-1" }],
    ["worklog-templates/template-1/edit", { screen: "worklog-edit", id: "template-1" }],
  ])("maps %s", (path, route) => {
    expect(resolveFormTemplatesRoute(path)).toEqual(route)
  })

  it.each(["new/extra", "collections/new", "worklog-templates/new/edit", "t/unknown",
    "t/workflow/s", "t/workflow/s/triggers/extra", "t//edit", "%", "%2F", "%5C", ".."])(
    "rejects an invalid route: %s", path => {
      expect(resolveFormTemplatesRoute(path)).toEqual({ screen: "not-found" })
    },
  )

  it.each(["new", "collections", "t/edit", "t/workflow", "t/workflow/s/triggers",
    "worklog-templates/new", "worklog-templates/t/edit"])("gates %s with source write permission", path => {
    expect(formTemplatesRoutePermission(resolveFormTemplatesRoute(path))).toBe(PERMISSIONS.FORMS_TEMPLATE_WRITE)
  })
  it.each(["", "t", "t/api", "worklog-templates", "worklog-templates/t"])(
    "inherits the source read permission at %s", path => {
      expect(formTemplatesRoutePermission(resolveFormTemplatesRoute(path))).toBe(PERMISSIONS.FORMS_TEMPLATE_READ)
    },
  )
})
