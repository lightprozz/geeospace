"use client"
// ---------------------------------------------------------------------------
// components/form-renderer/fields/multi-checkbox-field.tsx
// MultipleCheckBox(5). Value is an ARRAY of option ids even when
// `config.multiple === false` — that flag only limits the selection to one
// entry (the wire shape stays a list; `validate` rejects more than one).
// ---------------------------------------------------------------------------

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { decode } from "@/features/lms/lib/requests/field-value"
import type { Field, FieldOption } from "@/features/lms/types/request"

import type { FieldInputProps, FieldReadOnlyProps } from "../field-props"

import { ReadOnlyValue } from "./read-only-value"

function optionsOf(field: Field): FieldOption[] {
  return field.config?.options ?? []
}

function selectedIds(field: Field, value: unknown): string[] {
  const decoded = decode(field, value)
  return Array.isArray(decoded) ? decoded.map((item) => String(item)) : []
}

function labelsFor(field: Field, ids: string[]): string {
  const options = optionsOf(field)
  return ids
    .map((id) => options.find((option) => option.id === id)?.name ?? id)
    .join(", ")
}

export function MultiCheckBoxFieldInput({
  field,
  value,
  onChange,
  onBlur,
  disabled,
  inputId,
  labelledBy,
  describedBy,
  density,
}: FieldInputProps) {
  const selected = selectedIds(field, value)
  const single = field.config?.multiple === false

  function toggle(optionId: string, checked: boolean) {
    if (!checked) {
      onChange(selected.filter((id) => id !== optionId))
      return
    }
    onChange(single ? [optionId] : [...selected, optionId])
  }

  return (
    // `role="group"` supports neither aria-invalid nor aria-required — the
    // required marker sits in the label and the error node (role="alert") is
    // wired in through aria-describedby.
    <div
      id={inputId}
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className={density === "compact" ? "flex flex-col gap-1.5" : "flex flex-col gap-2"}
    >
      {optionsOf(field).map((option) => {
        const optionId = `${inputId}-${option.id}`
        return (
          <div key={option.id} className="flex items-center gap-2">
            <Checkbox
              id={optionId}
              checked={selected.includes(option.id)}
              onCheckedChange={(checked) => toggle(option.id, checked === true)}
              onBlur={onBlur}
              disabled={disabled}
            />
            <Label htmlFor={optionId} className="font-normal">
              {option.name}
            </Label>
          </div>
        )
      })}
    </div>
  )
}

export function MultiCheckBoxFieldReadOnly({
  field,
  value,
}: FieldReadOnlyProps) {
  const selected = selectedIds(field, value ?? field.value)
  return <ReadOnlyValue text={labelsFor(field, selected)} />
}
