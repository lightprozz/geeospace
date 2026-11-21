"use client"
// ---------------------------------------------------------------------------
// components/form-renderer/fields/degraded-picker-field.tsx
// PickUser(9), PickStudent(10), Facilities(13), PickStudentWithClass(15).
//
// These render READ-ONLY EVEN IN EDIT MODE — a product decision, not a bug:
// there is no forms.request.*-gated lookup for them this round, and the API
// answers 422 PICKER_NOT_EDITABLE to a new value. `encode` re-sends the stored
// value verbatim. A disabled combobox would read as "broken", so the stored
// value is shown as text with a short, non-alarming note instead.
// ---------------------------------------------------------------------------

import { Lock } from "lucide-react"

import { decode, resolveFieldType } from "@/features/lms/lib/requests/field-value"
import type {
  FacilitiesEntry,
  PersonEntry,
  StudentWithClassEntry,
} from "@/features/lms/lib/requests/field-value"
import { FieldType, type Field } from "@/features/lms/types/request"

import type { FieldInputProps, FieldReadOnlyProps } from "../field-props"

import { ReadOnlyValue } from "./read-only-value"

/**
 * Facilities stores the FULL campus/room objects the old picker captured, and
 * Newtonsoft round-trips them verbatim — so the inner keys keep their original
 * casing. Only the display label peeks inside; nothing is narrowed or rewritten.
 */
function facilitiesText(entry: FacilitiesEntry): string {
  const campus = typeof entry.campus?.name === "string" ? entry.campus.name : ""
  const room =
    typeof entry.room?.roomNumber === "string"
      ? entry.room.roomNumber
      : typeof entry.room?.name === "string"
        ? entry.room.name
        : ""
  return [campus, room].filter(Boolean).join(" · ")
}

function displayText(field: Field, value: unknown): string {
  const type = resolveFieldType(field, value)
  const decoded = decode(field, value)

  if (type === FieldType.PickUser) {
    return Array.isArray(decoded)
      ? (decoded as PersonEntry[])
          .map((person) => person.fullName || person.id)
          .filter(Boolean)
          .join(", ")
      : ""
  }

  if (decoded === null || typeof decoded !== "object") return ""

  if (type === FieldType.Facilities) {
    return facilitiesText(decoded as FacilitiesEntry)
  }

  if (type === FieldType.PickStudentWithClass) {
    const entry = decoded as StudentWithClassEntry
    return [entry.fullName || entry.id, entry.className]
      .filter(Boolean)
      .join(" — ")
  }

  const person = decoded as PersonEntry
  return person.fullName || person.id || ""
}

export function DegradedPickerFieldInput({
  field,
  value,
  inputId,
  describedBy,
}: FieldInputProps) {
  return (
    <div id={inputId} aria-describedby={describedBy}>
      <ReadOnlyValue text={displayText(field, value)} />
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
        Choosing a different value isn&apos;t available here yet — the stored
        value is kept as-is.
      </p>
    </div>
  )
}

export function DegradedPickerFieldReadOnly({
  field,
  value,
}: FieldReadOnlyProps) {
  return <ReadOnlyValue text={displayText(field, value ?? field.value)} />
}
