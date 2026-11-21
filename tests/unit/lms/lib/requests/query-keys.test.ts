// ---------------------------------------------------------------------------
// lib/requests/query-keys.test.ts
// The factory's nesting IS its contract: the mutation hooks invalidate by
// prefix, so a key that stops being a descendant of the prefix it was designed
// under silently stops refreshing. These tests pin the prefix relationships.
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest"
import { requestKeys } from "@/features/lms/lib/requests/query-keys"

/** TanStack's own prefix rule: a key is invalidated by any prefix of itself. */
function isInvalidatedBy(key: readonly unknown[], prefix: readonly unknown[]) {
  return prefix.every((segment, i) => Object.is(segment, key[i]))
}

describe("requestKeys", () => {
  it("invalidates every inbox page and the tab counts from lists()", () => {
    const prefix = requestKeys.lists()
    expect(isInvalidatedBy(requestKeys.list("action", {}), prefix)).toBe(true)
    expect(
      isInvalidatedBy(requestKeys.list("created", { page: 3 }), prefix),
    ).toBe(true)
    expect(isInvalidatedBy(requestKeys.counts({}), prefix)).toBe(true)
  })

  it("invalidates a request's whole read surface from detail(id)", () => {
    const prefix = requestKeys.detail("r1")
    expect(isInvalidatedBy(requestKeys.comments("r1"), prefix)).toBe(true)
    expect(isInvalidatedBy(requestKeys.activities("r1"), prefix)).toBe(true)
    expect(isInvalidatedBy(requestKeys.worklogStep("r1", "p1"), prefix)).toBe(true)
  })

  it("keeps one request's reads out of another's invalidation", () => {
    expect(
      isInvalidatedBy(requestKeys.comments("r2"), requestKeys.detail("r1")),
    ).toBe(false)
  })

  it("separates tabs and filter sets so a tab switch is its own cache entry", () => {
    expect(requestKeys.list("action", {})).not.toEqual(requestKeys.list("viewer", {}))
    expect(requestKeys.list("action", { keyword: "a" })).not.toEqual(
      requestKeys.list("action", { keyword: "b" }),
    )
  })

  it("does not invalidate templates or approver candidates from lists()", () => {
    const prefix = requestKeys.lists()
    expect(isInvalidatedBy(requestKeys.availableTemplates(), prefix)).toBe(false)
    expect(isInvalidatedBy(requestKeys.submitTemplate("t1"), prefix)).toBe(false)
    expect(isInvalidatedBy(requestKeys.approverCandidates("p1"), prefix)).toBe(false)
  })

  it("scopes approver candidates per step", () => {
    expect(requestKeys.approverCandidates("p1")).not.toEqual(
      requestKeys.approverCandidates("p2"),
    )
  })
})
