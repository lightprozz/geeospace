"use client"
// ---------------------------------------------------------------------------
// components/form-renderer/fields/long-text-field.tsx
// LongText(1).
// ---------------------------------------------------------------------------

import { Textarea } from "@/components/ui/textarea"
import { decode } from "@/features/lms/lib/requests/field-value"

import { fieldBlockClass } from "../field-density"
import type { FieldInputProps, FieldReadOnlyProps } from "../field-props"

import { ReadOnlyValue } from "./read-only-value"

function asText(field: FieldInputProps["field"], value: unknown) {
  const decoded = decode(field, value)
  return typeof decoded === "string" ? decoded : ""
}

export function LongTextFieldInput({
  field,
  value,
  onChange,
  onBlur,
  disabled,
  inputId,
  describedBy,
  invalid,
  density,
}: FieldInputProps) {
  return (
    <Textarea
      id={inputId}
      name={field.inputKey}
      rows={4}
      maxLength={field.config?.maxLength ?? undefined}
      value={asText(field, value)}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      disabled={disabled}
      required={field.required}
      aria-required={field.required || undefined}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={fieldBlockClass(density)}
    />
  )
}

export function LongTextFieldReadOnly({ field, value }: FieldReadOnlyProps) {
  return <ReadOnlyValue text={asText(field, value ?? field.value)} />
}
