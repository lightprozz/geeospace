import { describe, expect, it } from "vitest"
import { resolveRequestsRoute } from "@/features/forms/requests/routes"
import { toWindowPath } from "@/features/forms/window-adapter"

describe("Requests window routes", () => {
  it.each([
    ["", { screen: "inbox" }],
    ["?tab=created", { screen: "inbox" }],
    ["new", { screen: "new" }],
    ["new/template-1", { screen: "submit", templateId: "template-1" }],
    ["request-1", { screen: "detail", id: "request-1" }],
    ["/request-1/", { screen: "detail", id: "request-1" }],
    ["request-1/unknown", { screen: "not-found" }],
    ["new/template-1/unknown", { screen: "not-found" }],
  ])("maps %s to its screen", (path, screen) => {
    expect(resolveRequestsRoute(path)).toEqual(screen)
  })
})

describe("Forms window URL adapter", () => {
  it.each([
    ["/requests", "/requests", ""],
    ["/requests?tab=created", "/requests", ""],
    ["/requests/new/template-1", "/requests", "new/template-1"],
    ["/requests/request-1", "/requests", "request-1"],
    ["new", "/requests", "new"],
    ["/form-templates/template-1/workflow/step-1/triggers", "/form-templates", "template-1/workflow/step-1/triggers"],
  ])("maps %s within %s", (href, base, path) => {
    expect(toWindowPath(href, base)).toBe(path)
  })

  it("rejects navigation outside the window", () => {
    expect(() => toWindowPath("/form-templates", "/requests")).toThrow(
      "Cannot navigate outside this forms window",
    )
  })
})
