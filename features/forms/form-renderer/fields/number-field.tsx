"use client"
// ---------------------------------------------------------------------------
// components/form-renderer/fields/number-field.tsx
// Number(8). `config.format` is the v1 InputMask (#,## / #K / #%) and is shown
// as a hint only — the value on the wire is a plain number.
// ---------------------------------------------------------------------------

import { Input } from "@/components/ui/input"
import { decode } from "@/features/lms/lib/requests/field-value"

import { fieldInputClass } from "../field-density"
import type { FieldInputProps, FieldReadOnlyProps } from "../field-props"

import { ReadOnlyValue } from "./read-only-value"

/**
 * The RAW keystrokes stay in form state while typing ("-", "1.", "1e"): a
 * half-typed number must not be snapped back to null under the cursor.
 * `encode`/`validate` do the numeric narrowing.
 */
function asInputText(value: unknown): string {
  if (typeof value === "string") return value
  if (typeof value === "number")
    return Number.isFinite(value) ? String(value) : ""
  return ""
}

export function NumberFieldInput({
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
    <Input
      id={inputId}
      name={field.inputKey}
      type="number"
      inputMode="decimal"
      min={field.config?.min ?? undefined}
      max={field.config?.max ?? undefined}
      value={asInputText(value)}
      onChange={(event) => {
        const text = event.target.value
        onChange(text === "" ? null : text)
      }}
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

export function NumberFieldReadOnly({ field, value }: FieldReadOnlyProps) {
  const decoded = decode(field, value ?? field.value)
  return (
    <ReadOnlyValue text={typeof decoded === "number" ? String(decoded) : ""} />
  )
}
