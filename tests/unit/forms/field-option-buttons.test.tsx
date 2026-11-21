import { expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { TypeSpecificConfig } from "@/features/forms/form-templates/_components/field-type-config"
import type { NewField } from "@/features/lms/types/form-template"

it.each([3, 5])("option controls for field type %s never submit their enclosing form", type => {
  const field: NewField = {
    type, fieldName: "choice", label: "Choice", required: false, hidden: false, displayOrder: 0,
    config: { options: [{ id: "one", name: "One" }] },
  }
  const html = renderToStaticMarkup(
    <form><TypeSpecificConfig field={field} onUpdate={() => {}} /></form>,
  )
  const buttons = html.match(/<button\b[^>]*>/g) ?? []
  expect(buttons.length).toBeGreaterThanOrEqual(2)
  for (const button of buttons) expect(button).toContain('type="button"')
})
