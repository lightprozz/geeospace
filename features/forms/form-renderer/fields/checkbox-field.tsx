"use client"
// ---------------------------------------------------------------------------
// components/form-renderer/fields/checkbox-field.tsx
// CheckBox(4). A legacy numeric 1 decodes to FALSE — v2's mapper uses
// bool.TryParse, which does not accept "1"; see lib/requests/field-value.
// ---------------------------------------------------------------------------

import { Checkbox } from "@/components/ui/checkbox"
import { decode } from "@/features/lms/lib/requests/field-value"

import type { FieldInputProps, FieldReadOnlyProps } from "../field-props"

import { ReadOnlyValue } from "./read-only-value"

function asBool(field: FieldInputProps["field"], value: unknown): boolean {
  return decode(field, value) === true
}

export function CheckBoxFieldInput({
  field,
  value,
  onChange,
  onBlur,
  disabled,
  inputId,
  describedBy,
  invalid,
}: FieldInputProps) {
  return (
    <Checkbox
      id={inputId}
      name={field.inputKey}
      checked={asBool(field, value)}
      onCheckedChange={(checked) => onChange(checked === true)}
      onBlur={onBlur}
      disabled={disabled}
      aria-required={field.required || undefined}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
    />
  )
}

export function CheckBoxFieldReadOnly({ field, value }: FieldReadOnlyProps) {
  return (
    <ReadOnlyValue text={asBool(field, value ?? field.value) ? "Yes" : "No"} />
  )
}
