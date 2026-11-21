// ---------------------------------------------------------------------------
// components/form-renderer/form-model.test.ts
// Pure helpers behind the renderer: form keys, ordering, seed values, and the
// blocker list a submit screen needs in order to explain why a template with a
// REQUIRED degraded picker cannot be sent from here.
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest"

import { FieldType, type Field } from "@/features/lms/types/request"
import type { FormValue } from "@/features/lms/lib/requests/field-value"

import {
  buildAnswers,
  buildDefaultValues,
  fieldPath,
  findDegradedPickerBlockers,
  visibleFields,
} from "@/features/forms/form-renderer/form-model"

function makeField(overrides: Partial<Field> & { type: number }): Field {
  return {
    id: "field-1",
    fieldName: "Field name",
    label: "Field label",
    description: null,
    inputKey: "input-key",
    required: false,
    displayOrder: 0,
    hidden: false,
    config: {},
    value: null,
    ...overrides,
  }
}

describe("fieldPath", () => {
  it("produces a react-hook-form-safe key (no path characters)", () => {
    const path = fieldPath(makeField({ type: 0, id: "a.b[0].c" }))
    expect(path).not.toContain(".")
    expect(path).not.toContain("[")
  })

  it("is stable for the same field", () => {
    const field = makeField({ type: 0, id: "abc-123" })
    expect(fieldPath(field)).toBe(fieldPath(field))
  })
})

describe("visibleFields", () => {
  it("drops hidden fields and sorts by displayOrder", () => {
    const result = visibleFields([
      makeField({ type: 0, id: "c", displayOrder: 2 }),
      makeField({ type: 0, id: "h", displayOrder: 0, hidden: true }),
      makeField({ type: 0, id: "a", displayOrder: 1 }),
    ])
    expect(result.map((field) => field.id)).toEqual(["a", "c"])
  })

  it("keeps array order for equal displayOrder", () => {
    const result = visibleFields([
      makeField({ type: 0, id: "first", displayOrder: 1 }),
      makeField({ type: 0, id: "second", displayOrder: 1 }),
    ])
    expect(result.map((field) => field.id)).toEqual(["first", "second"])
  })
})

describe("buildDefaultValues", () => {
  it("seeds decoded values, INCLUDING hidden fields", () => {
    const visible = makeField({
      type: FieldType.ShortText,
      id: "v",
      value: "x",
    })
    const hidden = makeField({
      type: FieldType.CheckBox,
      id: "h",
      hidden: true,
      value: true,
    })

    const values = buildDefaultValues([visible, hidden])

    expect(values[fieldPath(visible)]).toBe("x")
    expect(values[fieldPath(hidden)]).toBe(true)
  })
})

describe("findDegradedPickerBlockers", () => {
  it("reports a REQUIRED degraded picker with no stored value", () => {
    const blockers = findDegradedPickerBlockers([
      makeField({
        type: FieldType.PickStudent,
        id: "s",
        label: "Student",
        required: true,
        value: null,
      }),
    ])

    expect(blockers).toHaveLength(1)
    expect(blockers[0].field.id).toBe("s")
    expect(blockers[0].message).toContain("Student")
  })

  it("does not report a degraded picker that already has a stored value", () => {
    const blockers = findDegradedPickerBlockers([
      makeField({
        type: FieldType.PickStudent,
        required: true,
        value: { id: "s1", fullName: "Grace Hopper" },
      }),
    ])
    expect(blockers).toEqual([])
  })

  it("does not report an optional degraded picker", () => {
    const blockers = findDegradedPickerBlockers([
      makeField({ type: FieldType.Facilities, required: false, value: null }),
    ])
    expect(blockers).toEqual([])
  })

  it("does not report PickClass — it is editable here", () => {
    const blockers = findDegradedPickerBlockers([
      makeField({ type: FieldType.PickClass, required: true, value: null }),
    ])
    expect(blockers).toEqual([])
  })

  it("ignores a HIDDEN required degraded picker", () => {
    // A hidden field is never rendered, so the submitter cannot fill it in.
    // Blocking on one would make an otherwise completable template
    // unsubmittable with no way out.
    const blockers = findDegradedPickerBlockers([
      makeField({
        type: FieldType.PickStudent,
        id: "hidden-student",
        label: "Student",
        required: true,
        hidden: true,
        value: null,
      }),
    ])

    expect(blockers).toEqual([])
  })

  it("still reports the VISIBLE degraded pickers alongside a hidden one", () => {
    const blockers = findDegradedPickerBlockers([
      makeField({
        type: FieldType.PickStudent,
        id: "hidden-student",
        required: true,
        hidden: true,
        value: null,
      }),
      makeField({
        type: FieldType.Facilities,
        id: "visible-facilities",
        label: "Facilities",
        required: true,
        value: null,
      }),
    ])

    expect(blockers).toHaveLength(1)
    expect(blockers[0].field.id).toBe("visible-facilities")
  })
})

// The form is keyed by `fieldPath(field)` — `f_<sanitized id>`. Reading
// `values[field.id]` instead silently yields `undefined` for every field and
// posts an empty answer, which is exactly the bug this helper was extracted
// to prevent.
describe("buildAnswers", () => {
  it("reads the value under the fieldPath key, not the raw field id", () => {
    const field = makeField({
      type: FieldType.ShortText,
      id: "abc-123",
      inputKey: "abc_123",
    })

    const answers = buildAnswers([field], {
      [fieldPath(field)]: "typed value",
    })

    expect(answers).toHaveLength(1)
    expect(answers[0].value).toBe("typed value")
    expect(answers[0].fieldId).toBe("abc-123")
    expect(answers[0].inputKey).toBe("abc_123")
  })

  it("does NOT pick up a value stored under the raw field id", () => {
    const field = makeField({ type: FieldType.ShortText, id: "abc-123" })

    const answers = buildAnswers([field], {
      "abc-123": "wrong key",
    } as Record<string, FormValue | undefined>)

    expect(answers[0].value).toBeNull()
  })

  it("posts one answer per field, including hidden fields", () => {
    const visible = makeField({ type: FieldType.ShortText, id: "v" })
    const hidden = makeField({
      type: FieldType.ShortText,
      id: "h",
      hidden: true,
      value: "stored",
    })

    const answers = buildAnswers([visible, hidden], {
      [fieldPath(visible)]: "shown",
      [fieldPath(hidden)]: "shown",
    })

    expect(answers.map((a) => a.fieldId)).toEqual(["v", "h"])
  })

  it("encodes the value with the field's own type rules", () => {
    const field = makeField({ type: FieldType.Number, id: "n" })

    const answers = buildAnswers([field], {
      [fieldPath(field)]: 42,
    })

    expect(answers[0].value).toBe(42)
    expect(answers[0].type).toBe(FieldType.Number)
  })

  it("posts the seeded value of a hidden field (it was never rendered)", () => {
    const hidden = makeField({
      type: FieldType.ShortText,
      id: "h",
      hidden: true,
      value: "stored",
    })

    // buildDefaultValues seeds hidden fields with their decoded stored value,
    // so the form DOES carry an entry even though the field is not rendered.
    const values = buildDefaultValues([hidden])
    const answers = buildAnswers([hidden], values)

    expect(answers[0].value).toBe("stored")
  })

  it("posts null for a field the form never carried", () => {
    const field = makeField({ type: FieldType.ShortText, id: "s" })

    const answers = buildAnswers([field], {})

    expect(answers[0].value).toBeNull()
  })
})
