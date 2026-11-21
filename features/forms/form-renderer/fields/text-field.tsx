"use client"
// ---------------------------------------------------------------------------
// components/form-renderer/fields/text-field.tsx
// ShortText(0), Email(7), PhoneNumber(12) — and the fallback for any legacy
// type number outside 0..15, which the BE mapper also treats as a string
// pass-through.
// ---------------------------------------------------------------------------

import { Input } from "@/components/ui/input"
import { decode, resolveFieldType } from "@/features/lms/lib/requests/field-value"
import { FieldType } from "@/features/lms/types/request"

import { fieldInputClass } from "../field-density"
import type { FieldInputProps, FieldReadOnlyProps } from "../field-props"

import { ReadOnlyValue } from "./read-only-value"

function asText(props: { field: FieldInputProps["field"]; value: unknown }) {
  const decoded = decode(props.field, props.value)
  return typeof decoded === "string" ? decoded : ""
}

/** `type`/`inputMode` per effective type — resolved by shape, never hard-mapped. */
function inputAttrs(field: FieldInputProps["field"], value: unknown) {
  switch (resolveFieldType(field, value)) {
    case FieldType.Email:
      return {
        type: "email",
        inputMode: "email" as const,
        autoComplete: "email",
      }
    case FieldType.PhoneNumber:
      return { type: "tel", inputMode: "tel" as const, autoComplete: "tel" }
    default:
      return { type: "text", inputMode: undefined, autoComplete: undefined }
  }
}

export function TextFieldInput({
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
  const attrs = inputAttrs(field, value)

  return (
    <Input
      id={inputId}
      name={field.inputKey}
      type={attrs.type}
      inputMode={attrs.inputMode}
      autoComplete={attrs.autoComplete}
      maxLength={field.config?.maxLength ?? undefined}
      value={asText({ field, value })}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      disabled={disabled}
      required={field.required}
      aria-required={field.required || undefined}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={fieldInputClass(density)}
    />
  )
}

export function TextFieldReadOnly({ field, value }: FieldReadOnlyProps) {
  return <ReadOnlyValue text={asText({ field, value: value ?? field.value })} />
}
