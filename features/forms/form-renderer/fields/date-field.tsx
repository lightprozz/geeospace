"use client"
// ---------------------------------------------------------------------------
// components/form-renderer/fields/date-field.tsx
// Date(2). Uses the repo's existing Popover + Calendar (react-day-picker)
// pairing — no new date library.
//
// ⚠️ A stored date is NOT guaranteed to be ISO-8601: FormFieldJsonMapper
// .DecodeDate passes an unparseable legacy value through unchanged. So an
// unparseable string is DISPLAYED VERBATIM and left untouched in form state —
// re-formatting it here would silently rewrite a value this client cannot
// parse. Only a date actually picked from the calendar becomes a `Date`, which
// `encode` then writes as ISO-8601.
// ---------------------------------------------------------------------------

import { CalendarIcon } from "lucide-react"
import { format, isValid, parseISO } from "date-fns"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { decode } from "@/features/lms/lib/requests/field-value"
import type { Field } from "@/features/lms/types/request"

import type { FieldInputProps, FieldReadOnlyProps } from "../field-props"

import { ReadOnlyValue } from "./read-only-value"

const DEFAULT_MASK = "dd/MM/yyyy"

/** The picked `Date`, or null when the stored string is not parseable. */
function toDate(value: unknown, field: Field): Date | null {
  if (value instanceof Date) return isValid(value) ? value : null
  const text =
    typeof decode(field, value) === "string" ? String(decode(field, value)) : ""
  if (text.trim() === "") return null
  const parsed = parseISO(text)
  return isValid(parsed) ? parsed : null
}

function displayText(value: unknown, field: Field): string {
  const date = toDate(value, field)
  if (date) {
    try {
      return format(date, field.config?.format || DEFAULT_MASK)
    } catch {
      // A v1 InputMask that date-fns cannot express — fall back, never throw.
      return format(date, DEFAULT_MASK)
    }
  }
  if (value instanceof Date) return ""
  const decoded = decode(field, value)
  return typeof decoded === "string" ? decoded : ""
}

export function DateFieldInput({
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
  const text = displayText(value, field)
  const isCompact = density === "compact"

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={inputId}
          type="button"
          variant="outline"
          disabled={disabled}
          onBlur={onBlur}
          aria-required={field.required || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={isCompact ? "h-9 w-full justify-start font-normal" : "w-full justify-start font-normal"}
        >
          <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
          {text || (
            <span className="text-muted-foreground">
              {field.config?.format || DEFAULT_MASK}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={toDate(value, field) ?? undefined}
          onSelect={(day) => onChange(day ?? null)}
          autoFocus
        />
        {!field.required && (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onChange(null)}
            >
              Clear date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export function DateFieldReadOnly({ field, value }: FieldReadOnlyProps) {
  return <ReadOnlyValue text={displayText(value ?? field.value, field)} />
}
