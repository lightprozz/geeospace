// ---------------------------------------------------------------------------
// lib/requests/field-value.ts
// PURE encode / decode / validate for the 16 FRM v2 field types. No React, no
// fetch, no side effects — the renderer, the submit path and the worklog-step
// path all go through here.
//
// COUNTERPART (authoritative — the API returns what IT does, not what the doc
// says): GeeOBEv2/GeeO.Services/Services/V2/Forms/FormFieldJsonMapper.cs
//
// Two rules run through every function:
//
//  1. NOTHING THROWS. The API is permissive with legacy data (v1 stored form
//     values as free-form JSON), and a field-value function that throws turns
//     one rendering quirk into a white screen for a whole request.
//  2. TYPES 12..15 ARE NEVER HARD-MAPPED. The BE enum and the old-FE enum that
//     authored live templates disagree on 12/13/14/15 and no data resolves it,
//     so the effective type is decided by the SHAPE of the value, exactly as
//     FormFieldJsonMapper.ResolveContestedByShape does, with the declared
//     number used only when the shape says nothing.
// ---------------------------------------------------------------------------

import { FieldType, type Field, type FieldConfig } from "@/features/lms/types/request"

// ---------------------------------------------------------------------------
// Form-state shapes
//
// Same per-type shapes the API returns, with every leaf normalized to a
// non-null primitive so React inputs never receive `null` as a value.
// ---------------------------------------------------------------------------

export interface AttachmentEntry {
  url: string
  fileName: string
}

/**
 * Attachment(6) form state.
 *
 * `stored` are the files the API already holds ({url, fileName}); `pending`
 * are the browser `File`s the user just picked. The two live apart because a
 * `File` has no `url` — encoding one would post a blank `{url:"",fileName:""}`
 * entry, and the real bytes travel in the multipart parts of the submit.
 */
export interface AttachmentFormValue {
  stored: AttachmentEntry[]
  pending?: File[]
}

export interface PersonEntry {
  id: string
  fullName: string
}

export interface StudentWithClassEntry {
  id: string
  fullName: string
  classId: string
  className: string
}

export interface FacilitiesEntry {
  campus: Record<string, unknown> | null
  room: Record<string, unknown> | null
}

export type FormValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | AttachmentEntry[]
  | AttachmentFormValue
  | PersonEntry[]
  | PersonEntry
  | StudentWithClassEntry
  | FacilitiesEntry

/**
 * Pickers with NO forms.request.*-gated v2 lookup this round (user decision):
 * they render READ-ONLY and `encode` re-sends the stored value verbatim. The
 * API rejects a NEW value for them with 422 PICKER_NOT_EDITABLE.
 * PickClass(11) is deliberately absent — it is fully editable via the existing
 * classes lookup.
 */
export const DEGRADED_PICKER_TYPES = [
  FieldType.PickUser,
  FieldType.PickStudent,
  FieldType.Facilities,
  FieldType.PickStudentWithClass,
] as const

export function isDegradedPicker(type: number): boolean {
  return (DEGRADED_PICKER_TYPES as readonly number[]).includes(type)
}

// ---------------------------------------------------------------------------
// Coercion primitives — total functions, never throw
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** Objects and arrays coerce to "" rather than "[object Object]". */
function toText(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") return value
  if (typeof value === "number")
    return Number.isFinite(value) ? String(value) : ""
  if (typeof value === "boolean") return String(value)
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString()
  }
  return ""
}

/** Mirrors the mapper's `double.TryParse` fallback: unparseable -> null. */
function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string") {
    const text = value.trim()
    if (text === "") return null
    const parsed = Number(text)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/**
 * Mirrors the mapper's `bool.TryParse`: "true"/"True" parse, but a numeric 1
 * does NOT — so a legacy `1` decodes to false on both sides of the wire.
 */
function toBool(value: unknown): boolean {
  if (typeof value === "boolean") return value
  if (typeof value === "string") return value.trim().toLowerCase() === "true"
  return false
}

function toPerson(value: Record<string, unknown>): PersonEntry {
  return { id: toText(value.id), fullName: toText(value.fullName) }
}

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item) => typeof item === "string" || typeof item === "number")
      .map((item) => String(item))
  }
  // v1 single-select storage is the bare option id, not a list.
  if (typeof value === "string" && value !== "") return [value]
  return []
}

/**
 * A browser `File` (or anything shaped like one) is NOT a stored attachment.
 * It has no `url`, so encoding one would post a blank `{url:"",fileName:""}`
 * entry — the real bytes travel in the multipart parts of the submit.
 */
function isBrowserFile(value: unknown): boolean {
  if (typeof File !== "undefined" && value instanceof File) return true
  if (typeof Blob !== "undefined" && value instanceof Blob) return true
  if (!isRecord(value)) return false
  // Duck-typing for environments without the File global.
  return (
    typeof value.name === "string" &&
    typeof value.size === "number" &&
    value.url === undefined
  )
}

/**
 * Only ALREADY-STORED attachments ({url, fileName}) belong in a field value.
 * A browser `File` picked for upload travels in the multipart parts, not here.
 */
function toAttachments(value: unknown): AttachmentEntry[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => isRecord(item) && !isBrowserFile(item))
    .map((item) => ({
      url: toText(item.url),
      fileName: toText(item.fileName),
    }))
}

/**
 * The two halves of an Attachment(6) field state: the files the API already
 * holds and the files the user just picked but has not submitted yet.
 */
export interface AttachmentState {
  stored: AttachmentEntry[]
  pending: File[]
}

/**
 * Reads an Attachment(6) field value in either shape:
 * - `{ stored, pending? }` — the shape the form state uses;
 * - a bare array — the shape the API stores (legacy rows, and the encoded
 *   answer itself).
 */
export function toAttachmentState(value: unknown): AttachmentState {
  if (isRecord(value)) {
    const pending = Array.isArray(value.pending)
      ? value.pending.filter((item) => isBrowserFile(item))
      : []
    return { stored: toAttachments(value.stored), pending: pending as File[] }
  }
  return { stored: toAttachments(value), pending: [] }
}

function toPersonList(value: unknown): PersonEntry[] {
  if (Array.isArray(value)) return value.filter(isRecord).map(toPerson)
  // The mapper lifts a single stored object into the array form.
  if (isRecord(value)) return [toPerson(value)]
  return []
}

function toStudentWithClass(value: unknown): StudentWithClassEntry | null {
  if (!isRecord(value)) return null
  return {
    id: toText(value.id),
    fullName: toText(value.fullName),
    classId: toText(value.classId),
    className: toText(value.className),
  }
}

function toFacilities(value: unknown): FacilitiesEntry | null {
  if (!isRecord(value)) return null
  return {
    campus: isRecord(value.campus) ? value.campus : null,
    room: isRecord(value.room) ? value.room : null,
  }
}

// ---------------------------------------------------------------------------
// Contested 12..15 resolution — by VALUE SHAPE, never by number
// (FormFieldJsonMapper.ResolveContestedByShape / ResolveEffectiveTypeForWrite)
// ---------------------------------------------------------------------------

function shapeOf(value: unknown): number | null {
  if (isRecord(value)) {
    if (value.campus != null || value.room != null) return FieldType.Facilities
    if (value.classId != null || value.className != null) {
      return FieldType.PickStudentWithClass
    }
    return null
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return FieldType.Rating
  }
  if (typeof value === "string" && value !== "") return FieldType.PhoneNumber
  return null
}

/**
 * Rating params are the only signal a BLANK contested field can carry. `max`
 * alone is ambiguous (Number(8) config carries one too), so only `precision`
 * and `iconType` count.
 */
function ratingHint(config: FieldConfig | undefined): number | null {
  if (!config) return null
  return config.precision != null || config.iconType != null
    ? FieldType.Rating
    : null
}

/**
 * The effective type of `field`. `candidateValue` (the value being decoded, or
 * the form value being encoded) is consulted FIRST — it identifies the type
 * even when the stored row is blank — then the stored value, then the config,
 * and only then the declared number.
 *
 * Types outside 12..15 pass straight through, INCLUDING an unknown legacy
 * number such as 99: the mapper treats those as string pass-throughs and so
 * does this module.
 */
export function resolveFieldType(
  field: Field,
  candidateValue?: unknown
): number {
  const declared = field.type
  if (!Number.isInteger(declared) || declared < 12 || declared > 15) {
    return declared
  }
  return (
    shapeOf(candidateValue) ??
    shapeOf(field.value) ??
    ratingHint(field.config) ??
    declared
  )
}

// ---------------------------------------------------------------------------
// decode — API typed value -> form state
// ---------------------------------------------------------------------------

/**
 * Normalizes one API field value into form state. Defaults to the field's own
 * `value`, so `decode(field)` seeds an initial form.
 */
export function decode(
  field: Field,
  apiValue: unknown = field.value
): FormValue {
  const type = resolveFieldType(field, apiValue)

  switch (type) {
    case FieldType.CheckBox:
      return toBool(apiValue)

    case FieldType.MultipleCheckBox:
      // A collection type: a blank field is an empty selection, not null.
      return toStringList(apiValue)

    case FieldType.Attachment:
      // The API stores a bare array of {url, fileName}; the form state is the
      // composite {stored, pending} so a picked-but-unsubmitted File has a
      // home that `validate` can count.
      return toAttachmentState(apiValue)

    case FieldType.Number:
    case FieldType.Rating:
      return toNumber(apiValue)

    case FieldType.PickUser:
      return toPersonList(apiValue)

    case FieldType.PickStudent:
    case FieldType.PickClass:
      return isRecord(apiValue) ? toPerson(apiValue) : null

    case FieldType.PickStudentWithClass:
      return toStudentWithClass(apiValue)

    case FieldType.Facilities:
      return toFacilities(apiValue)

    // ShortText, LongText, Date (ISO-8601 on the wire), Dropdown (option id),
    // Email, PhoneNumber — and any unknown legacy type number.
    default:
      return toText(apiValue)
  }
}

// ---------------------------------------------------------------------------
// encode — form state -> AnswerDto.value
// ---------------------------------------------------------------------------

function encodeValue(type: number, value: unknown): FormValue {
  switch (type) {
    case FieldType.Date: {
      if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value.toISOString()
      }
      // A string is passed through UNCHANGED: the server re-parses it with the
      // field's InputMask, and normalizing here would silently rewrite an
      // old-FE-authored value that this client cannot parse.
      const text = toText(value).trim()
      return text === "" ? null : text
    }

    case FieldType.CheckBox:
      return toBool(value)

    case FieldType.MultipleCheckBox:
      return toStringList(value)

    case FieldType.Attachment:
      // ONLY the stored entries are posted. The pending `File`s travel in the
      // multipart parts of the submit — encoding them here would post blank
      // `{url:"",fileName:""}` entries alongside the real answer.
      return toAttachmentState(value).stored

    case FieldType.Number:
    case FieldType.Rating:
      return toNumber(value)

    case FieldType.PickUser:
      return toPersonList(value)

    case FieldType.PickStudent:
    case FieldType.PickClass:
      return isRecord(value) ? toPerson(value) : null

    case FieldType.PickStudentWithClass:
      return toStudentWithClass(value)

    case FieldType.Facilities:
      return toFacilities(value)

    // ShortText, LongText, Dropdown (option id), Email, PhoneNumber, and any
    // unknown legacy type number.
    default:
      return value === null || value === undefined ? null : toText(value)
  }
}

/**
 * Turns form state into the value posted as `AnswerDto.value`.
 *
 * ⚠️ For a DEGRADED PICKER the caller's value is IGNORED and the field's own
 * stored value is re-encoded instead. Those types render read-only because no
 * lookup is reachable from a request submitter this round, and the API answers
 * 422 PICKER_NOT_EDITABLE to a new value — so a stray change must never leave
 * the client. `validate` blocks submit when a REQUIRED degraded picker has no
 * stored value.
 */
export function encode(field: Field, formValue: unknown): FormValue {
  const type = resolveFieldType(field, formValue)
  if (isDegradedPicker(type)) {
    return encodeValue(type, decode(field, field.value))
  }
  return encodeValue(type, formValue)
}

// ---------------------------------------------------------------------------
// validate — form state -> one human-readable message, or null
// ---------------------------------------------------------------------------

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[+()\-.\s\d]{6,20}$/

/** 0 and `false`-for-a-checkbox are handled per type; an empty array/object counts as empty. */
function isEmptyValue(value: FormValue): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === "string") return value.trim() === ""
  if (typeof value === "boolean") return !value
  if (typeof value === "number") return false
  if (Array.isArray(value)) return value.length === 0
  if (isRecord(value)) {
    if ("campus" in value || "room" in value) {
      return value.campus == null && value.room == null
    }
    return toText(value.id).trim() === ""
  }
  return false
}

function labelOf(field: Field): string {
  return field.label?.trim() || field.fieldName
}

/**
 * Returns the first problem with `formValue`, or null when it is acceptable.
 *
 * Server-side validation still runs — this only keeps a doomed submit from
 * leaving the browser. Callers decide whether to run it on `hidden` fields
 * (a hidden required field cannot be fixed by the user).
 */
export function validate(field: Field, formValue: unknown): string | null {
  const type = resolveFieldType(field, formValue)

  // A degraded picker cannot be edited here, so its stored value — not the
  // form value — is what will actually be submitted.
  const value = isDegradedPicker(type)
    ? decode(field, field.value)
    : decode(field, formValue)
  const empty = isEmptyValue(value)

  if (isDegradedPicker(type)) {
    if (field.required && empty) {
      return `${labelOf(field)} is read-only in this version and has no stored value, so this request cannot be submitted here.`
    }
    return null
  }

  if (type === FieldType.Attachment) {
    // A picked-but-unsubmitted File counts as an answer for the REQUIRED
    // check — the bytes are already chosen, they just travel as multipart
    // parts instead of inside the JSON answer.
    const state = toAttachmentState(formValue)
    const total = state.stored.length + state.pending.length

    if (field.required && total === 0) return "This field is required."

    const maxFiles = field.config?.maxFiles
    if (maxFiles != null && total > maxFiles) {
      return `At most ${maxFiles} files can be attached.`
    }
    return null
  }

  if (field.required && empty) return "This field is required."

  switch (type) {
    case FieldType.Email:
      if (!empty && !EMAIL_PATTERN.test(String(value))) {
        return "Enter a valid email address."
      }
      return null

    case FieldType.PhoneNumber:
      if (!empty && !PHONE_PATTERN.test(String(value))) {
        return "Enter a valid phone number."
      }
      return maxLengthError(field, value)

    case FieldType.Number:
    case FieldType.Rating:
      return numberError(field, type, formValue, value)

    case FieldType.MultipleCheckBox:
      if (
        field.config?.multiple === false &&
        Array.isArray(value) &&
        value.length > 1
      ) {
        return "Only one option can be selected."
      }
      return null

    default:
      return maxLengthError(field, value)
  }
}

function maxLengthError(field: Field, value: FormValue): string | null {
  const maxLength = field.config?.maxLength
  if (
    maxLength != null &&
    typeof value === "string" &&
    value.length > maxLength
  ) {
    return `Must be at most ${maxLength} characters.`
  }
  return null
}

function numberError(
  field: Field,
  type: number,
  formValue: unknown,
  value: FormValue
): string | null {
  if (value === null) {
    // Something WAS entered but it is not a number — encoding it to null would
    // silently discard the user's input.
    const entered =
      typeof formValue === "string"
        ? formValue.trim() !== ""
        : formValue != null && typeof formValue !== "object"
    return entered ? "Enter a valid number." : null
  }

  const numeric = value as number
  // Rating is bounded even with no params: the mapper defaults max to 5.
  const min = type === FieldType.Rating ? 0 : field.config?.min
  const max =
    type === FieldType.Rating ? (field.config?.max ?? 5) : field.config?.max

  if (min != null && numeric < min) return `Must be at least ${min}.`
  if (max != null && numeric > max) return `Must be at most ${max}.`
  return null
}
