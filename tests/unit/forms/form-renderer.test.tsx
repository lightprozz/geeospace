// ---------------------------------------------------------------------------
// components/form-renderer/form-renderer.test.tsx
// Render coverage for the shared dynamic form renderer: every field type in
// both modes, plus the schema-level rules (hidden, displayOrder, degraded
// pickers).
//
// Rendering goes through react-dom/server — light markup assertions only. The
// per-type VALUE logic is already covered by lib/requests/field-value.test.ts
// and is deliberately not re-tested here.
// ---------------------------------------------------------------------------

import { afterEach, describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { useForm } from "react-hook-form"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { FieldType, type Field } from "@/features/lms/types/request"
import { useCan, usePermissionsLoaded } from "@/lib/use-can"

import { FormRenderer, type RequestFormValues } from "@/features/forms/form-renderer/form-renderer"
import { buildDefaultValues } from "@/features/forms/form-renderer/form-model"

vi.mock("@/lib/use-can", () => ({
  useCan: vi.fn(() => false),
  usePermissionsLoaded: vi.fn(() => false),
}))

afterEach(() => {
  vi.mocked(useCan).mockReturnValue(false)
  vi.mocked(usePermissionsLoaded).mockReturnValue(false)
})

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

function makeField(overrides: Partial<Field> & { type: number }): Field {
  return {
    id: `field-${overrides.type}`,
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

function EditHarness({
  fields,
  density,
}: {
  fields: Field[]
  density?: "compact" | "comfortable"
}) {
  const { control } = useForm<RequestFormValues>({
    defaultValues: buildDefaultValues(fields),
  })
  return (
    <FormRenderer
      fields={fields}
      mode="edit"
      control={control}
      density={density}
    />
  )
}

function renderEdit(fields: Field[]): string {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <EditHarness fields={fields} />
    </QueryClientProvider>
  )
}

function renderReadOnly(fields: Field[]): string {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <FormRenderer fields={fields} mode="readonly" />
    </QueryClientProvider>
  )
}

/** Anything a user could type into or operate. */
const EDITABLE_MARKUP = [
  "<input",
  "<textarea",
  "<select",
  'role="checkbox"',
  'role="combobox"',
]

// ---------------------------------------------------------------------------
// Per-type cases
// ---------------------------------------------------------------------------

interface TypeCase {
  name: string
  field: Field
  /** Substrings the EDIT rendering must contain. */
  edit: string[]
  /** Substrings the READONLY rendering must contain. */
  readOnly: string[]
}

const CASES: TypeCase[] = [
  {
    name: "ShortText(0)",
    field: makeField({
      type: FieldType.ShortText,
      label: "Reason",
      value: "Sick leave",
      config: { maxLength: 50 },
    }),
    edit: ['type="text"', 'value="Sick leave"', 'maxLength="50"', "Reason"],
    readOnly: ["Sick leave", "Reason"],
  },
  {
    name: "LongText(1)",
    field: makeField({
      type: FieldType.LongText,
      label: "Details",
      value: "A longer explanation",
    }),
    edit: ["<textarea", "A longer explanation"],
    readOnly: ["A longer explanation"],
  },
  {
    name: "Date(2)",
    field: makeField({
      type: FieldType.Date,
      label: "Start date",
      value: "2026-03-01",
      config: { format: "dd/MM/yyyy" },
    }),
    edit: ["01/03/2026", "Start date"],
    readOnly: ["01/03/2026"],
  },
  {
    name: "Dropdown(3)",
    field: makeField({
      type: FieldType.Dropdown,
      label: "Campus",
      value: "c2",
      config: {
        options: [
          { id: "c1", name: "Campus One" },
          { id: "c2", name: "Campus Two" },
        ],
      },
    }),
    edit: ["Campus Two"],
    readOnly: ["Campus Two"],
  },
  {
    name: "CheckBox(4)",
    field: makeField({
      type: FieldType.CheckBox,
      label: "Confirmed",
      value: true,
    }),
    edit: ['role="checkbox"', 'aria-checked="true"', "Confirmed"],
    readOnly: ["Yes"],
  },
  {
    name: "MultipleCheckBox(5)",
    field: makeField({
      type: FieldType.MultipleCheckBox,
      label: "Equipment",
      value: ["o2"],
      config: {
        multiple: true,
        options: [
          { id: "o1", name: "Projector" },
          { id: "o2", name: "Whiteboard" },
        ],
      },
    }),
    edit: ['role="group"', "Projector", "Whiteboard"],
    readOnly: ["Whiteboard"],
  },
  {
    name: "Attachment(6)",
    field: makeField({
      type: FieldType.Attachment,
      label: "Files",
      value: [{ url: "https://example.test/a.pdf", fileName: "a.pdf" }],
      config: { maxFiles: 3 },
    }),
    edit: ['type="file"', "a.pdf", "https://example.test/a.pdf"],
    readOnly: ["a.pdf"],
  },
  {
    name: "Email(7)",
    field: makeField({
      type: FieldType.Email,
      label: "Contact email",
      value: "teacher@geeo.test",
    }),
    edit: ['type="email"', "teacher@geeo.test"],
    readOnly: ["teacher@geeo.test"],
  },
  {
    name: "Number(8)",
    field: makeField({
      type: FieldType.Number,
      label: "Headcount",
      value: 12,
      config: { min: 1, max: 30 },
    }),
    edit: ['type="number"', 'value="12"', 'min="1"', 'max="30"'],
    readOnly: ["12"],
  },
  {
    name: "PickUser(9)",
    field: makeField({
      type: FieldType.PickUser,
      label: "Approvers",
      value: [{ id: "u1", fullName: "Ada Lovelace" }],
      config: { multiple: true },
    }),
    edit: ["Ada Lovelace", "stored value is kept as-is"],
    readOnly: ["Ada Lovelace"],
  },
  {
    name: "PickStudent(10)",
    field: makeField({
      type: FieldType.PickStudent,
      label: "Student",
      value: { id: "s1", fullName: "Grace Hopper" },
      config: { multiple: false },
    }),
    edit: ["Grace Hopper", "stored value is kept as-is"],
    readOnly: ["Grace Hopper"],
  },
  {
    name: "PickClass(11)",
    field: makeField({
      type: FieldType.PickClass,
      label: "Class",
      value: { id: "c1", fullName: "IELTS 6.0 A" },
      config: { multiple: false },
    }),
    edit: ['role="combobox"', "IELTS 6.0 A"],
    readOnly: ["IELTS 6.0 A"],
  },
  {
    name: "PhoneNumber(12)",
    field: makeField({
      type: FieldType.PhoneNumber,
      label: "Phone",
      value: "+84 90 123 4567",
    }),
    edit: ['type="tel"', "+84 90 123 4567"],
    readOnly: ["+84 90 123 4567"],
  },
  {
    name: "Facilities(13)",
    field: makeField({
      type: FieldType.Facilities,
      label: "Room booking",
      value: {
        campus: { id: "c1", name: "District 1" },
        room: { id: "r1", roomNumber: "A-201" },
      },
    }),
    edit: ["District 1", "A-201", "stored value is kept as-is"],
    readOnly: ["District 1", "A-201"],
  },
  {
    name: "Rating(14)",
    field: makeField({
      type: FieldType.Rating,
      label: "Satisfaction",
      value: 4,
      config: { max: 5, precision: 1 },
    }),
    edit: ['aria-label="4 of 5"', "4 / 5"],
    readOnly: ["4 / 5"],
  },
  {
    name: "PickStudentWithClass(15)",
    field: makeField({
      type: FieldType.PickStudentWithClass,
      label: "Student in class",
      value: {
        id: "s1",
        fullName: "Alan Turing",
        classId: "c1",
        className: "TOEIC B",
      },
      config: { multiple: false },
    }),
    edit: ["Alan Turing", "TOEIC B", "stored value is kept as-is"],
    readOnly: ["Alan Turing", "TOEIC B"],
  },
]

describe("FormRenderer — per type", () => {
  for (const testCase of CASES) {
    it(`${testCase.name} renders in edit mode`, () => {
      const html = renderEdit([testCase.field])
      for (const expected of testCase.edit) expect(html).toContain(expected)
    })

    it(`${testCase.name} renders in readonly mode`, () => {
      const html = renderReadOnly([testCase.field])
      for (const expected of testCase.readOnly) expect(html).toContain(expected)
      for (const editable of EDITABLE_MARKUP) {
        expect(html).not.toContain(editable)
      }
    })
  }

  it("falls back to a text input for an unknown legacy type number", () => {
    const html = renderEdit([
      makeField({ type: 99, label: "Legacy", value: "kept" }),
    ])
    expect(html).toContain('type="text"')
    expect(html).toContain('value="kept"')
  })
})

// ---------------------------------------------------------------------------
// Schema-level rules
// ---------------------------------------------------------------------------

describe("FormRenderer — schema rules", () => {
  it("renders an empty form in both modes without controls", () => {
    for (const html of [renderEdit([]), renderReadOnly([])]) {
      for (const editable of EDITABLE_MARKUP) {
        expect(html).not.toContain(editable)
      }
      expect(html).not.toContain("<label")
    }
  })

  const visible = makeField({
    type: FieldType.ShortText,
    id: "visible",
    label: "Visible field",
    displayOrder: 1,
  })
  const hidden = makeField({
    type: FieldType.ShortText,
    id: "hidden",
    label: "Hidden field",
    displayOrder: 0,
    hidden: true,
  })

  it("does not render hidden fields in either mode", () => {
    expect(renderEdit([visible, hidden])).not.toContain("Hidden field")
    expect(renderReadOnly([visible, hidden])).not.toContain("Hidden field")
  })

  it("orders fields by displayOrder, not array order", () => {
    const first = makeField({
      type: FieldType.ShortText,
      id: "second-in-array",
      label: "Alpha",
      displayOrder: 1,
    })
    const second = makeField({
      type: FieldType.ShortText,
      id: "first-in-array",
      label: "Beta",
      displayOrder: 2,
    })

    const html = renderEdit([second, first])
    expect(html.indexOf("Alpha")).toBeLessThan(html.indexOf("Beta"))
  })

  it("conveys required to assistive tech, not by colour alone", () => {
    const html = renderEdit([
      makeField({
        type: FieldType.ShortText,
        label: "Reason",
        required: true,
      }),
    ])
    expect(html).toContain('aria-required="true"')
    expect(html).toContain("(required)")
  })

  it("binds the description to the input with aria-describedby", () => {
    const html = renderEdit([
      makeField({
        type: FieldType.ShortText,
        id: "described",
        label: "Reason",
        description: "Explain briefly",
      }),
    ])
    expect(html).toContain('id="f_described-description"')
    expect(html).toContain('aria-describedby="f_described-description"')
  })
})

// ---------------------------------------------------------------------------
// Column spans
//
// The grid owns the flow: from `md` up a compact renderer is two columns and
// a field marked "full" spans both. Nothing pairs fields in JS any more, so
// the span is the only thing that decides the layout.
// ---------------------------------------------------------------------------

describe("FormRenderer — column spans", () => {
  function renderDensity(density: "compact" | "comfortable", fields: Field[]): string {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    return renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <EditHarness fields={fields} density={density} />
      </QueryClientProvider>
    )
  }

  it("marks a compact short field as short (no column span)", () => {
    const html = renderDensity("compact", [
      makeField({ type: FieldType.ShortText, id: "short", label: "Reason" }),
    ])
    expect(html).toContain('data-width="short"')
    expect(html).not.toContain("md:col-span-2")
  })

  it("marks a compact wide field as full (spans both columns)", () => {
    const html = renderDensity("compact", [
      makeField({ type: FieldType.LongText, id: "wide", label: "Details" }),
    ])
    expect(html).toContain('data-width="full"')
    expect(html).toContain("md:col-span-2")
  })

  it("marks every comfortable field as full", () => {
    const html = renderDensity("comfortable", [
      makeField({ type: FieldType.ShortText, id: "short", label: "Reason" }),
      makeField({ type: FieldType.Date, id: "date", label: "Start date" }),
    ])
    expect(html).not.toContain('data-width="short"')
    expect(html.match(/md:col-span-2/g)?.length).toBe(2)
  })

  it("uses a single column grid for comfortable density", () => {
    const html = renderDensity("comfortable", [
      makeField({ type: FieldType.ShortText, id: "short", label: "Reason" }),
    ])
    expect(html).toContain('data-density="comfortable"')
    expect(html).not.toContain("md:grid-cols-2")
  })

  it("uses a two column grid for compact density", () => {
    const html = renderDensity("compact", [
      makeField({ type: FieldType.ShortText, id: "short", label: "Reason" }),
    ])
    expect(html).toContain('data-density="compact"')
    expect(html).toContain("md:grid-cols-2")
  })
})

// ---------------------------------------------------------------------------
// Degraded pickers (user decision — read-only even in edit mode)
// ---------------------------------------------------------------------------

describe("FormRenderer — degraded pickers", () => {
  it("keeps the class value without a lookup control when permission is denied", () => {
    vi.mocked(usePermissionsLoaded).mockReturnValue(true)
    const html = renderEdit([
      makeField({
        type: FieldType.PickClass,
        value: { id: "c1", fullName: "Stored Class" },
      }),
    ])
    expect(html).toContain("Stored Class")
    expect(html).toContain("You do not have permission")
    expect(html).not.toContain('role="combobox"')
  })

  it("allows the class lookup control with class.read", () => {
    vi.mocked(usePermissionsLoaded).mockReturnValue(true)
    vi.mocked(useCan).mockReturnValue(true)
    expect(renderEdit([makeField({ type: FieldType.PickClass })]))
      .toContain('role="combobox"')
  })

  // Each value is in its own type's stored SHAPE — the contested 12..15 range
  // is resolved by shape, so a mismatched value would (correctly) render as a
  // different type.
  const degradedCases: { type: number; value: unknown }[] = [
    {
      type: FieldType.PickUser,
      value: [{ id: "u1", fullName: "Stored Person" }],
    },
    {
      type: FieldType.PickStudent,
      value: { id: "s1", fullName: "Stored Person" },
    },
    {
      type: FieldType.Facilities,
      value: { campus: { name: "Stored Person" }, room: null },
    },
    {
      type: FieldType.PickStudentWithClass,
      value: {
        id: "s1",
        fullName: "Stored Person",
        classId: "c1",
        className: "TOEIC B",
      },
    },
  ]

  for (const { type, value } of degradedCases) {
    it(`type ${type} renders no editable control in edit mode`, () => {
      const html = renderEdit([makeField({ type, label: "Picker", value })])
      expect(html).toContain("Stored Person")
      for (const editable of EDITABLE_MARKUP) {
        expect(html).not.toContain(editable)
      }
      // Not a disabled control that merely LOOKS broken.
      expect(html).not.toContain("disabled")
    })
  }

  it("PickClass(11) stays editable in edit mode", () => {
    const html = renderEdit([
      makeField({
        type: FieldType.PickClass,
        label: "Class",
        value: { id: "c1", fullName: "IELTS 6.0 A" },
      }),
    ])
    expect(html).toContain('role="combobox"')
  })
})
