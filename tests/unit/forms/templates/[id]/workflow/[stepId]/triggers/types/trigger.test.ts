// ---------------------------------------------------------------------------
// types/trigger.test.ts
// W-H6 guard: the BE now maps `ProcessAction` to the enum name, but a row
// written before that fix still carries the numeric ordinal ("0"/"1"/"2").
// The form must never show a raw number and never send one back.
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest"

import { normalizeHttpMethod, normalizeProcessAction } from "@/features/forms/form-templates/[id]/workflow/[stepId]/triggers/types/trigger"

describe("normalizeProcessAction", () => {
  it("passes an enum name through", () => {
    expect(normalizeProcessAction("APPROVED")).toBe("APPROVED")
    expect(normalizeProcessAction("DENIED")).toBe("DENIED")
    expect(normalizeProcessAction("WORKLOGGED")).toBe("WORKLOGGED")
  })

  it("upper-cases a lowercase enum name", () => {
    expect(normalizeProcessAction("approved")).toBe("APPROVED")
  })

  it("maps a numeric ordinal to the enum name", () => {
    expect(normalizeProcessAction(0)).toBe("APPROVED")
    expect(normalizeProcessAction(1)).toBe("DENIED")
    expect(normalizeProcessAction(2)).toBe("WORKLOGGED")
  })

  it("maps a numeric string to the enum name", () => {
    expect(normalizeProcessAction("0")).toBe("APPROVED")
    expect(normalizeProcessAction("1")).toBe("DENIED")
    expect(normalizeProcessAction("2")).toBe("WORKLOGGED")
  })

  it("returns an empty string for an unknown value", () => {
    expect(normalizeProcessAction("SOMETHING")).toBe("")
    expect(normalizeProcessAction(9)).toBe("")
    expect(normalizeProcessAction(null)).toBe("")
    expect(normalizeProcessAction(undefined)).toBe("")
  })
})

describe("normalizeHttpMethod", () => {
  it("passes a valid method through", () => {
    expect(normalizeHttpMethod("POST")).toBe("POST")
    expect(normalizeHttpMethod("DELETE")).toBe("DELETE")
  })

  it("upper-cases a lowercase method", () => {
    expect(normalizeHttpMethod("patch")).toBe("PATCH")
  })

  it("returns an empty string for an unknown method", () => {
    expect(normalizeHttpMethod("TRACE")).toBe("")
    expect(normalizeHttpMethod(1)).toBe("")
  })
})
