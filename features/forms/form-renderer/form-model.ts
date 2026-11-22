// ---------------------------------------------------------------------------
// components/form-renderer/form-model.ts
// Pure helpers shared by the renderer and its callers (submit screen, detail
// screen, worklog-in-step). No React — everything here is testable in isolation
// and every per-type value decision still comes from lib/requests/field-value.
// ---------------------------------------------------------------------------

import {
  decode,
  encode,
  isDegradedPicker,
  resolveFieldType,
  validate,
  type FormValue,
} from "@/features/lms/lib/requests/field-value"
import type { Answer, Field } from "@/features/lms/types/request"

/**
 * react-hook-form reads `a.b` and `a[0]` as PATHS, so a raw field id is not
 * safe as a form key. This is the one name mapping — `buildDefaultValues` and
 * the renderer both go through it, and callers reading `getValues()` must too.
 */
export function fieldPath(field: Field): string {
  return `f_${field.id.replace(/[^A-Za-z0-9_-]/g, "_")}`
}

/** Fields actually rendered: visible ones, ordered by `displayOrder`. */
export function visibleFields(fields: Field[]): Field[] {
  return fields
    .filter((field) => !field.hidden)
    .map((field, index) => ({ field, index }))
    .sort(
      (a, b) => a.field.displayOrder - b.field.displayOrder || a.index - b.index
    )
    .map((entry) => entry.field)
}

/**
 * Seeds react-hook-form. HIDDEN fields are included: they are not rendered but
 * their stored value still has to be posted back untouched.
 */
export function buildDefaultValues(fields: Field[]): Record<string, FormValue> {
  const values: Record<string, FormValue> = {}
  for (const field of fields) {
    values[fieldPath(field)] = decode(field)
  }
  return values
}

export interface DegradedPickerBlocker {
  field: Field
  /** Ready-to-show explanation from `validate`. */
  message: string
}

/**
 * Fields that make a template UNSUBMITTABLE here: a REQUIRED degraded picker
 * (PickUser/PickStudent/Facilities/PickStudentWithClass) with no stored value.
 * Nothing in this module blocks anything — the caller decides what to do,
 * because only the caller knows whether it is a submit, a save, or a read.
 *
 * HIDDEN fields are skipped: they are not rendered, so the submitter cannot
 * fill them in, and blocking on one would make an otherwise completable
 * template unsubmittable with no way out. A hidden field's stored value is
 * posted back untouched by `buildAnswers`.
 */
export function findDegradedPickerBlockers(
  fields: Field[]
): DegradedPickerBlocker[] {
  const blockers: DegradedPickerBlocker[] = []
  for (const field of fields) {
    if (field.hidden) continue
    if (!isDegradedPicker(resolveFieldType(field))) continue
    const message = validate(field, undefined)
    if (message) blockers.push({ field, message })
  }
  return blockers
}

/**
 * Turns react-hook-form values into the posted answer list.
 *
 * The form is keyed by `fieldPath(field)` — NOT by the raw field id — so the
 * lookup MUST go through `fieldPath`. Reading `values[field.id]` silently
 * yields `undefined` and posts an empty answer for every field, which is why
 * this lives in one shared helper used by the submit screen AND the
 * worklog-in-step card.
 *
 * HIDDEN fields are included on purpose: they are not rendered, but their
 * stored value still has to be posted back untouched.
 */
export function buildAnswers(
  fields: Field[],
  values: Record<string, FormValue | undefined>,
): Answer[] {
  return fields.map((field) => {
    const path = fieldPath(field)
    return {
      fieldId: field.id,
      inputKey: field.inputKey,
      type: field.type,
      value: encode(field, values[path]),
    }
  })
}
