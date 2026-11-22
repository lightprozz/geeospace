"use client"
// ---------------------------------------------------------------------------
// components/form-renderer/fields/dropdown-field.tsx
// Dropdown(3). The value is the option ID; the label comes from `name`
// (FormFieldJsonMapper.ParseOptions always emits `name` — the doc's older
// `{id,text}` claim is dead).
// ---------------------------------------------------------------------------

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { decode } from "@/features/lms/lib/requests/field-value"
import type { Field, FieldOption } from "@/features/lms/types/request"

import type { FieldInputProps, FieldReadOnlyProps } from "../field-props"

import { ReadOnlyValue } from "./read-only-value"

function optionsOf(field: Field): FieldOption[] {
  return field.config?.options ?? []
}

function selectedId(field: Field, value: unknown): string {
  const decoded = decode(field, value)
  return typeof decoded === "string" ? decoded : ""
}

/** Falls back to the raw ID so a stale option still shows something. */
function labelFor(field: Field, id: string): string {
  if (id === "") return ""
  return optionsOf(field).find((option) => option.id === id)?.name ?? id
}

export function DropdownFieldInput({
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
  const current = selectedId(field, value)
  const options = optionsOf(field)
  const isStale = current !== "" && !options.some((o) => o.id === current)
  const isCompact = density === "compact"

  return (
    <div className="flex items-center gap-2">
      <Select
        value={current || undefined}
        onValueChange={(next) => onChange(next)}
        disabled={disabled}
      >
        <SelectTrigger
          id={inputId}
          onBlur={onBlur}
          aria-required={field.required || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={isCompact ? "h-9 w-full" : "w-full"}
        >
          <SelectValue placeholder="Select an option">
            {current ? labelFor(field, current) : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {/* A stored id no longer offered by the template stays selectable so
              the user does not lose it by simply opening the list. */}
          {isStale && (
            <SelectItem value={current}>{labelFor(field, current)}</SelectItem>
          )}
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!field.required && current !== "" && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange("")}
        >
          Clear
          <span className="sr-only"> {field.label || field.fieldName}</span>
        </Button>
      )}
    </div>
  )
}

export function DropdownFieldReadOnly({ field, value }: FieldReadOnlyProps) {
  const current = selectedId(field, value ?? field.value)
  return <ReadOnlyValue text={labelFor(field, current)} />
}
