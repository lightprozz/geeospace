// ---------------------------------------------------------------------------
// lib/requests/field-value.test.ts
// The pure encode/decode/validate core, tested against the BE counterpart
// GeeOBEv2/GeeO.Services/Services/V2/Forms/FormFieldJsonMapper.cs.
// A divergence here corrupts submitted answers and, downstream, live
// outbound webhooks — so every one of the 16 types is pinned in both
// directions, plus a malformed-input case proving nothing throws.
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest"
import { FieldType, type Field } from "@/features/lms/types/request"
import {
  DEGRADED_PICKER_TYPES,
  decode,
  encode,
  isDegradedPicker,
  resolveFieldType,
  validate,
  type AttachmentFormValue,
} from "@/features/lms/lib/requests/field-value"

function makeField(overrides: Partial<Field> = {}): Field {
  return {
    id: "field-1",
    fieldName: "field_1",
    label: "Field 1",
    description: null,
    type: FieldType.ShortText,
    inputKey: "field_1",
    required: false,
    displayOrder: 0,
    hidden: false,
    config: {},
    value: null,
    ...overrides,
  }
}

/** Every value a legacy row could plausibly carry on ANY type. */
const MALFORMED_INPUTS: unknown[] = [
  undefined,
  null,
  "",
  "not-a-value",
  0,
  -1,
  NaN,
  true,
  [],
  [null],
  [{}],
  {},
  { id: null },
  { url: 1 },
  new Date("invalid"),
]

// ---------------------------------------------------------------------------
// resolveFieldType — the contested 12..15 range, resolved by VALUE SHAPE
// (mirrors FormFieldJsonMapper.ResolveContestedByShape). Never hard-mapped.
// ---------------------------------------------------------------------------

describe("resolveFieldType", () => {
  it("passes every type outside 12..15 straight through", () => {
    for (const type of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
      expect(resolveFieldType(makeField({ type, value: "x" }))).toBe(type)
    }
  })

  it("resolves a {campus, room} value to Facilities even when declared Rating", () => {
    const field = makeField({
      type: FieldType.Rating,
      value: { campus: { id: "c1" }, room: { id: "r1" } },
    })
    expect(resolveFieldType(field)).toBe(FieldType.Facilities)
  })

  it("resolves a numeric value to Rating even when declared Facilities", () => {
    const field = makeField({ type: FieldType.Facilities, value: 4 })
    expect(resolveFieldType(field)).toBe(FieldType.Rating)
  })

  it("resolves a {classId, className} value to PickStudentWithClass", () => {
    const field = makeField({
      type: FieldType.PhoneNumber,
      value: { id: "s1", fullName: "Ann", classId: "c1", className: "M2" },
    })
    expect(resolveFieldType(field)).toBe(FieldType.PickStudentWithClass)
  })

  it("resolves a bare string value to PhoneNumber", () => {
    const field = makeField({
      type: FieldType.PickStudentWithClass,
      value: "+84 903 000 111",
    })
    expect(resolveFieldType(field)).toBe(FieldType.PhoneNumber)
  })

  it("falls back to rating config hints when the field carries no value", () => {
    const field = makeField({
      type: FieldType.PhoneNumber,
      value: null,
      config: { max: 10, precision: 0.5, iconType: "star" },
    })
    expect(resolveFieldType(field)).toBe(FieldType.Rating)
  })

  it("falls back to the declared number when the shape says nothing", () => {
    expect(resolveFieldType(makeField({ type: 13, value: null }))).toBe(13)
    expect(resolveFieldType(makeField({ type: 15, value: null }))).toBe(15)
  })

  it("keeps an unknown legacy type number rather than throwing", () => {
    expect(resolveFieldType(makeField({ type: 99, value: "x" }))).toBe(99)
  })
})

// ---------------------------------------------------------------------------
// 0 ShortText / 1 LongText / 7 Email / 12 PhoneNumber — string
// ---------------------------------------------------------------------------

describe.each([
  ["ShortText(0)", FieldType.ShortText, "ok"],
  ["LongText(1)", FieldType.LongText, "ok"],
  ["Email(7)", FieldType.Email, "a@b.co"],
  ["PhoneNumber(12)", FieldType.PhoneNumber, "0903000111"],
])("%s", (_label, type, filled) => {
  const field = makeField({ type })

  it("decodes a string straight through", () => {
    expect(decode(field, "hello")).toBe("hello")
  })

  it("decodes null to an empty string", () => {
    expect(decode(field, null)).toBe("")
  })

  it("encodes a string straight through", () => {
    expect(encode(field, "hello")).toBe("hello")
  })

  it("round-trips", () => {
    expect(decode(field, encode(field, "hello"))).toBe("hello")
    expect(decode(field, encode(field, ""))).toBe("")
  })

  it("flags a required empty value", () => {
    const required = makeField({ type, required: true })
    expect(validate(required, "")).toBeTruthy()
    expect(validate(required, "   ")).toBeTruthy()
    expect(validate(required, filled)).toBeNull()
  })

  it("never throws on malformed input", () => {
    for (const input of MALFORMED_INPUTS) {
      expect(() => decode(field, input)).not.toThrow()
      expect(() => encode(field, input)).not.toThrow()
      expect(() => validate(field, input)).not.toThrow()
    }
  })
})

describe("text config", () => {
  it("enforces maxLength", () => {
    const field = makeField({
      type: FieldType.ShortText,
      config: { maxLength: 3 },
    })
    expect(validate(field, "abc")).toBeNull()
    expect(validate(field, "abcd")).toContain("3")
  })

  it("validates email shape only for Email(7)", () => {
    const email = makeField({ type: FieldType.Email })
    expect(validate(email, "nope")).toBeTruthy()
    expect(validate(email, "a@b.co")).toBeNull()
    expect(
      validate(makeField({ type: FieldType.ShortText }), "nope")
    ).toBeNull()
  })

  it("validates phone shape only for PhoneNumber(12)", () => {
    const phone = makeField({ type: FieldType.PhoneNumber, value: "0" })
    expect(validate(phone, "abc")).toBeTruthy()
    expect(validate(phone, "+84 903 000 111")).toBeNull()
    expect(validate(phone, "")).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 2 Date — ISO-8601 string on the wire (the mask only affects the server-side
// Answers projection, which the FE never sees)
// ---------------------------------------------------------------------------

describe("Date(2)", () => {
  const field = makeField({
    type: FieldType.Date,
    config: { format: "dd/MM/yyyy" },
  })

  it("decodes an ISO string unchanged", () => {
    expect(decode(field, "2026-07-28T00:00:00.0000000Z")).toBe(
      "2026-07-28T00:00:00.0000000Z"
    )
  })

  it("decodes null to an empty string", () => {
    expect(decode(field, null)).toBe("")
  })

  it("encodes a Date object as ISO-8601", () => {
    expect(encode(field, new Date(Date.UTC(2026, 6, 28)))).toBe(
      "2026-07-28T00:00:00.000Z"
    )
  })

  it("encodes an empty value as null", () => {
    expect(encode(field, "")).toBeNull()
  })

  it("passes an unparseable legacy value through instead of dropping it", () => {
    expect(encode(field, "28/07/2026")).toBe("28/07/2026")
  })

  it("round-trips an ISO string", () => {
    const iso = "2026-07-28T09:30:00.000Z"
    expect(decode(field, encode(field, iso))).toBe(iso)
  })

  it("flags a required empty value", () => {
    expect(validate(makeField({ ...field, required: true }), "")).toBeTruthy()
  })

  it("never throws on malformed input", () => {
    for (const input of MALFORMED_INPUTS) {
      expect(() => decode(field, input)).not.toThrow()
      expect(() => encode(field, input)).not.toThrow()
      expect(() => validate(field, input)).not.toThrow()
    }
  })
})

// ---------------------------------------------------------------------------
// 3 Dropdown — string (option ID; the label lives under option.name)
// ---------------------------------------------------------------------------

describe("Dropdown(3)", () => {
  const field = makeField({
    type: FieldType.Dropdown,
    config: {
      options: [
        { id: "opt-1", name: "Annual leave" },
        { id: "opt-2", name: "Sick leave" },
      ],
    },
  })

  it("decodes the stored option id", () => {
    expect(decode(field, "opt-2")).toBe("opt-2")
  })

  it("decodes null to an empty string", () => {
    expect(decode(field, null)).toBe("")
  })

  it("encodes the option id, not the label", () => {
    expect(encode(field, "opt-2")).toBe("opt-2")
  })

  it("round-trips", () => {
    expect(decode(field, encode(field, "opt-1"))).toBe("opt-1")
  })

  it("flags a required empty selection", () => {
    expect(validate(makeField({ ...field, required: true }), "")).toBeTruthy()
    expect(
      validate(makeField({ ...field, required: true }), "opt-1")
    ).toBeNull()
  })

  it("never throws on malformed input", () => {
    for (const input of MALFORMED_INPUTS) {
      expect(() => decode(field, input)).not.toThrow()
      expect(() => encode(field, input)).not.toThrow()
      expect(() => validate(field, input)).not.toThrow()
    }
  })
})

// ---------------------------------------------------------------------------
// 4 CheckBox — boolean
// ---------------------------------------------------------------------------

describe("CheckBox(4)", () => {
  const field = makeField({ type: FieldType.CheckBox })

  it("decodes a boolean", () => {
    expect(decode(field, true)).toBe(true)
    expect(decode(field, false)).toBe(false)
  })

  it("decodes null as false", () => {
    expect(decode(field, null)).toBe(false)
  })

  it("accepts v1's stringified booleans, in either casing", () => {
    expect(decode(field, "true")).toBe(true)
    expect(decode(field, "True")).toBe(true)
    expect(decode(field, "False")).toBe(false)
  })

  it("encodes a boolean", () => {
    expect(encode(field, true)).toBe(true)
    expect(encode(field, null)).toBe(false)
  })

  it("round-trips", () => {
    expect(decode(field, encode(field, true))).toBe(true)
    expect(decode(field, encode(field, false))).toBe(false)
  })

  it("treats an unticked required checkbox as empty", () => {
    const required = makeField({ ...field, required: true })
    expect(validate(required, false)).toBeTruthy()
    expect(validate(required, true)).toBeNull()
  })

  it("never throws on malformed input", () => {
    for (const input of MALFORMED_INPUTS) {
      expect(() => decode(field, input)).not.toThrow()
      expect(() => encode(field, input)).not.toThrow()
      expect(() => validate(field, input)).not.toThrow()
    }
  })
})

// ---------------------------------------------------------------------------
// 5 MultipleCheckBox — string[] of option ids (the BE flattens v1's positional
// nested index map at the boundary and re-inflates it on write)
// ---------------------------------------------------------------------------

describe("MultipleCheckBox(5)", () => {
  const options = [
    { id: "a", name: "Alpha" },
    { id: "b", name: "Beta" },
    { id: "c", name: "Gamma" },
  ]
  const field = makeField({
    type: FieldType.MultipleCheckBox,
    config: { options, multiple: true },
  })

  it("decodes an id array", () => {
    expect(decode(field, ["a", "c"])).toEqual(["a", "c"])
  })

  it("decodes null as an empty selection, not null", () => {
    expect(decode(field, null)).toEqual([])
  })

  it("lifts a single stored id into an array", () => {
    const single = makeField({
      type: FieldType.MultipleCheckBox,
      config: { options, multiple: false },
    })
    expect(decode(single, "b")).toEqual(["b"])
  })

  it("encodes an id array", () => {
    expect(encode(field, ["a", "b"])).toEqual(["a", "b"])
  })

  it("round-trips", () => {
    expect(decode(field, encode(field, ["a", "c"]))).toEqual(["a", "c"])
  })

  it("flags a required empty selection", () => {
    const required = makeField({ ...field, required: true })
    expect(validate(required, [])).toBeTruthy()
    expect(validate(required, ["a"])).toBeNull()
  })

  it("rejects multiple selections on a single-select field", () => {
    const single = makeField({
      type: FieldType.MultipleCheckBox,
      config: { options, multiple: false },
    })
    expect(validate(single, ["a", "b"])).toBeTruthy()
    expect(validate(single, ["a"])).toBeNull()
    expect(validate(field, ["a", "b"])).toBeNull()
  })

  it("never throws on malformed input", () => {
    for (const input of MALFORMED_INPUTS) {
      expect(() => decode(field, input)).not.toThrow()
      expect(() => encode(field, input)).not.toThrow()
      expect(() => validate(field, input)).not.toThrow()
    }
  })
})

// ---------------------------------------------------------------------------
// 6 Attachment — the form state is `{stored, pending?}`: the files the API
// already holds, and the browser `File`s the user just picked (they travel in
// the multipart parts, never in the JSON answer). The Answers projection
// renames fileName to name server-side; the FE never sees that projection.
// ---------------------------------------------------------------------------

describe("Attachment(6)", () => {
  const field = makeField({
    type: FieldType.Attachment,
    config: { maxFiles: 2 },
  })
  const stored = [{ url: "https://x/y.pdf", fileName: "y.pdf" }]

  it("decodes the stored array into the composite form state", () => {
    expect(decode(field, stored)).toEqual({ stored, pending: [] })
  })

  it("decodes null as an empty attachment state", () => {
    expect(decode(field, null)).toEqual({ stored: [], pending: [] })
  })

  it("normalizes a null url/fileName to an empty string", () => {
    const decoded = decode(field, [{ url: null, fileName: null }]) as
      AttachmentFormValue
    expect(decoded.stored).toEqual([{ url: "", fileName: "" }])
  })

  it("encodes with the fileName key, never name", () => {
    const encoded = encode(field, { stored, pending: [] }) as unknown as Record<
      string,
      unknown
    >[]
    expect(encoded[0]).toEqual({ url: "https://x/y.pdf", fileName: "y.pdf" })
    expect(encoded[0]).not.toHaveProperty("name")
  })

  it("encodes ONLY the stored entries — a pending File never reaches the answer", () => {
    const pending = new File(["bytes"], "z.pdf", { type: "application/pdf" })
    const encoded = encode(field, { stored, pending: [pending] }) as unknown as Record<
      string,
      unknown
    >[]
    expect(encoded).toEqual(stored)
    expect(encoded).toHaveLength(1)
  })

  it("encodes an empty state as an empty array", () => {
    expect(encode(field, { stored: [], pending: [] })).toEqual([])
  })

  it("round-trips the stored half", () => {
    const decoded = decode(field, encode(field, { stored, pending: [] }))
    expect(decoded).toEqual({ stored, pending: [] })
  })

  it("flags a required empty list and enforces maxFiles", () => {
    expect(
      validate(makeField({ ...field, required: true }), { stored: [], pending: [] })
    ).toBeTruthy()
    expect(
      validate(field, { stored: [...stored, ...stored], pending: [] })
    ).toBeNull()
    expect(
      validate(field, { stored: [...stored, ...stored], pending: [new File(["x"], "a.pdf")] })
    ).toContain("2")
  })

  it("counts a pending File toward the required check", () => {
    const required = makeField({ ...field, required: true })
    expect(
      validate(required, { stored: [], pending: [new File(["x"], "a.pdf")] })
    ).toBeNull()
  })

  it("never throws on malformed input", () => {
    for (const input of MALFORMED_INPUTS) {
      expect(() => decode(field, input)).not.toThrow()
      expect(() => encode(field, input)).not.toThrow()
      expect(() => validate(field, input)).not.toThrow()
    }
  })
})

// ---------------------------------------------------------------------------
// 8 Number / 14 Rating — number (null, NOT 0, when unanswered: 0 is a legal
// answer and required-validation must be able to tell them apart)
// ---------------------------------------------------------------------------

describe("Number(8)", () => {
  const field = makeField({
    type: FieldType.Number,
    config: { min: 1, max: 10, format: "#,##" },
  })

  it("decodes a number", () => {
    expect(decode(field, 42)).toBe(42)
    expect(decode(field, 0)).toBe(0)
  })

  it("decodes a numeric string, mirroring the BE's TryParse fallback", () => {
    expect(decode(field, "42.5")).toBe(42.5)
  })

  it("decodes null and unparseable text as null", () => {
    expect(decode(field, null)).toBeNull()
    expect(decode(field, "")).toBeNull()
    expect(decode(field, "abc")).toBeNull()
  })

  it("encodes a number and round-trips", () => {
    expect(encode(field, 7)).toBe(7)
    expect(encode(field, null)).toBeNull()
    expect(decode(field, encode(field, 7))).toBe(7)
    expect(decode(field, encode(field, 0))).toBe(0)
  })

  it("flags a required empty value but accepts 0", () => {
    const required = makeField({
      type: FieldType.Number,
      required: true,
      config: { min: 0 },
    })
    expect(validate(required, null)).toBeTruthy()
    expect(validate(required, 0)).toBeNull()
  })

  it("enforces min and max", () => {
    expect(validate(field, 0)).toBeTruthy()
    expect(validate(field, 11)).toBeTruthy()
    expect(validate(field, 5)).toBeNull()
  })

  it("never throws on malformed input", () => {
    for (const input of MALFORMED_INPUTS) {
      expect(() => decode(field, input)).not.toThrow()
      expect(() => encode(field, input)).not.toThrow()
      expect(() => validate(field, input)).not.toThrow()
    }
  })
})

describe("Rating(14)", () => {
  const field = makeField({
    type: FieldType.Rating,
    config: { max: 5, precision: 0.5, iconType: "star" },
  })

  it("decodes, encodes and round-trips a number", () => {
    expect(decode(field, 3.5)).toBe(3.5)
    expect(encode(field, 3.5)).toBe(3.5)
    expect(decode(field, encode(field, 3.5))).toBe(3.5)
  })

  it("decodes null as null", () => {
    expect(decode(field, null)).toBeNull()
  })

  it("flags a required empty rating", () => {
    expect(validate(makeField({ ...field, required: true }), null)).toBeTruthy()
    expect(validate(makeField({ ...field, required: true }), 1)).toBeNull()
  })

  it("enforces the configured max", () => {
    expect(validate(field, 6)).toBeTruthy()
    expect(validate(field, 5)).toBeNull()
    expect(validate(field, -1)).toBeTruthy()
  })

  it("never throws on malformed input", () => {
    for (const input of MALFORMED_INPUTS) {
      expect(() => decode(field, input)).not.toThrow()
      expect(() => encode(field, input)).not.toThrow()
      expect(() => validate(field, input)).not.toThrow()
    }
  })
})

// ---------------------------------------------------------------------------
// 9 PickUser — [{ id, fullName }]: the ONLY array picker
// ---------------------------------------------------------------------------

describe("PickUser(9)", () => {
  const stored = [{ id: "u1", fullName: "Ann" }]
  const field = makeField({
    type: FieldType.PickUser,
    config: { multiple: true },
    value: stored,
  })

  it("decodes an array of person refs", () => {
    expect(decode(field, stored)).toEqual(stored)
  })

  it("decodes null as an empty array", () => {
    expect(decode(field, null)).toEqual([])
  })

  it("lifts a single stored object into an array, as the BE mapper does", () => {
    expect(decode(field, { id: "u1", fullName: "Ann" })).toEqual(stored)
  })

  it("encodes the stored value and round-trips", () => {
    expect(encode(field, stored)).toEqual(stored)
    expect(decode(field, encode(field, stored))).toEqual(stored)
  })

  it("never throws on malformed input", () => {
    for (const input of MALFORMED_INPUTS) {
      expect(() => decode(field, input)).not.toThrow()
      expect(() => encode(field, input)).not.toThrow()
      expect(() => validate(field, input)).not.toThrow()
    }
  })
})

// ---------------------------------------------------------------------------
// 10 PickStudent / 11 PickClass — { id, fullName } single objects
// ---------------------------------------------------------------------------

describe.each([
  ["PickStudent(10)", FieldType.PickStudent],
  ["PickClass(11)", FieldType.PickClass],
])("%s", (_label, type) => {
  const stored = { id: "x1", fullName: "Ann" }
  const field = makeField({ type, config: { multiple: false }, value: stored })

  it("decodes a single object", () => {
    expect(decode(field, stored)).toEqual(stored)
  })

  it("decodes null as null", () => {
    expect(decode(field, null)).toBeNull()
  })

  it("normalizes missing keys instead of dropping the value", () => {
    expect(decode(field, { id: "x1" })).toEqual({ id: "x1", fullName: "" })
  })

  it("round-trips", () => {
    expect(decode(field, encode(field, stored))).toEqual(stored)
  })

  it("flags a required empty pick", () => {
    const required = makeField({ type, required: true, config: {} })
    expect(validate(required, null)).toBeTruthy()
    expect(validate(required, { id: "", fullName: "" })).toBeTruthy()
  })

  it("never throws on malformed input", () => {
    for (const input of MALFORMED_INPUTS) {
      expect(() => decode(field, input)).not.toThrow()
      expect(() => encode(field, input)).not.toThrow()
      expect(() => validate(field, input)).not.toThrow()
    }
  })
})

// ---------------------------------------------------------------------------
// 13 Facilities — { campus: {...}, room: {...} }, the FULL API objects
// ---------------------------------------------------------------------------

describe("Facilities(13)", () => {
  const stored = {
    campus: { id: "c1", name: "District 1", address: "12 Le Loi" },
    room: { id: "r1", roomNumber: "A-101", floor: 1 },
  }
  const field = makeField({ type: FieldType.Facilities, value: stored })

  it("decodes both objects opaquely, without narrowing to {id,name}", () => {
    expect(decode(field, stored)).toEqual(stored)
  })

  it("decodes null as null", () => {
    expect(decode(field, null)).toBeNull()
  })

  it("keeps a half-filled value rather than dropping it", () => {
    expect(decode(field, { campus: { id: "c1" } })).toEqual({
      campus: { id: "c1" },
      room: null,
    })
  })

  it("round-trips", () => {
    expect(decode(field, encode(field, stored))).toEqual(stored)
  })

  it("never throws on malformed input", () => {
    for (const input of MALFORMED_INPUTS) {
      expect(() => decode(field, input)).not.toThrow()
      expect(() => encode(field, input)).not.toThrow()
      expect(() => validate(field, input)).not.toThrow()
    }
  })
})

// ---------------------------------------------------------------------------
// 15 PickStudentWithClass — { id, fullName, classId, className }
// ---------------------------------------------------------------------------

describe("PickStudentWithClass(15)", () => {
  const stored = {
    id: "s1",
    fullName: "Ann",
    classId: "c1",
    className: "M2 - Upper",
  }
  const field = makeField({
    type: FieldType.PickStudentWithClass,
    config: { multiple: false },
    value: stored,
  })

  it("decodes all four properties", () => {
    expect(decode(field, stored)).toEqual(stored)
  })

  it("decodes null as null", () => {
    expect(decode(field, null)).toBeNull()
  })

  it("normalizes missing keys instead of dropping the value", () => {
    expect(decode(field, { id: "s1", className: "M2" })).toEqual({
      id: "s1",
      fullName: "",
      classId: "",
      className: "M2",
    })
  })

  it("round-trips", () => {
    expect(decode(field, encode(field, stored))).toEqual(stored)
  })

  it("never throws on malformed input", () => {
    for (const input of MALFORMED_INPUTS) {
      expect(() => decode(field, input)).not.toThrow()
      expect(() => encode(field, input)).not.toThrow()
      expect(() => validate(field, input)).not.toThrow()
    }
  })
})

// ---------------------------------------------------------------------------
// Degraded pickers — 9, 10, 13, 15 render READ-ONLY (user decision: there is
// no forms.request.*-gated lookup for them this round). The API rejects a new
// value with 422 PICKER_NOT_EDITABLE, so encode must never send one.
// ---------------------------------------------------------------------------

describe("degraded pickers", () => {
  it("lists exactly PickUser, PickStudent, Facilities and PickStudentWithClass", () => {
    expect([...DEGRADED_PICKER_TYPES].sort((a, b) => a - b)).toEqual([
      9, 10, 13, 15,
    ])
    expect(isDegradedPicker(FieldType.PickClass)).toBe(false)
    expect(isDegradedPicker(FieldType.PickUser)).toBe(true)
  })

  it("refuses a changed PickStudent value and re-sends the stored one", () => {
    const field = makeField({
      type: FieldType.PickStudent,
      value: { id: "s1", fullName: "Ann" },
    })
    expect(encode(field, { id: "s2", fullName: "Bob" })).toEqual({
      id: "s1",
      fullName: "Ann",
    })
  })

  it("refuses a changed PickUser value", () => {
    const field = makeField({
      type: FieldType.PickUser,
      value: [{ id: "u1", fullName: "Ann" }],
    })
    expect(encode(field, [{ id: "u2", fullName: "Bob" }])).toEqual([
      { id: "u1", fullName: "Ann" },
    ])
  })

  it("refuses a changed Facilities value", () => {
    const field = makeField({
      type: FieldType.Facilities,
      value: { campus: { id: "c1" }, room: { id: "r1" } },
    })
    expect(encode(field, { campus: { id: "c9" }, room: { id: "r9" } })).toEqual(
      {
        campus: { id: "c1" },
        room: { id: "r1" },
      }
    )
  })

  it("refuses a changed PickStudentWithClass value", () => {
    const field = makeField({
      type: FieldType.PickStudentWithClass,
      value: { id: "s1", fullName: "Ann", classId: "c1", className: "M2" },
    })
    expect(
      encode(field, {
        id: "s9",
        fullName: "Zoe",
        classId: "c9",
        className: "M9",
      })
    ).toEqual({ id: "s1", fullName: "Ann", classId: "c1", className: "M2" })
  })

  it("still encodes an edited PickClass value — 11 is fully editable", () => {
    const field = makeField({
      type: FieldType.PickClass,
      value: { id: "c1", fullName: "M2" },
    })
    expect(encode(field, { id: "c2", fullName: "M3" })).toEqual({
      id: "c2",
      fullName: "M3",
    })
  })

  it("blocks submit with an explanation when a required one is unfilled", () => {
    for (const type of DEGRADED_PICKER_TYPES) {
      const field = makeField({ type, required: true, value: null })
      const message = validate(field, decode(field, null))
      expect(message).toBeTruthy()
      expect(message).toContain("read-only")
    }
  })

  it("passes validation when the stored value is already filled", () => {
    const field = makeField({
      type: FieldType.PickStudent,
      required: true,
      value: { id: "s1", fullName: "Ann" },
    })
    expect(validate(field, decode(field))).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Legacy / defensive behaviour
// ---------------------------------------------------------------------------

describe("unknown legacy type numbers", () => {
  const field = makeField({ type: 99 })

  it("falls back to the BE mapper's string pass-through", () => {
    expect(decode(field, "whatever")).toBe("whatever")
    expect(encode(field, "whatever")).toBe("whatever")
    expect(decode(field, null)).toBe("")
  })

  it("never throws", () => {
    for (const input of MALFORMED_INPUTS) {
      expect(() => decode(field, input)).not.toThrow()
      expect(() => encode(field, input)).not.toThrow()
      expect(() => validate(field, input)).not.toThrow()
    }
  })
})

describe("decode defaults to the field's own value", () => {
  it("reads field.value when no explicit api value is passed", () => {
    expect(decode(makeField({ type: FieldType.ShortText, value: "v" }))).toBe(
      "v"
    )
    expect(decode(makeField({ type: FieldType.MultipleCheckBox }))).toEqual([])
  })
})
