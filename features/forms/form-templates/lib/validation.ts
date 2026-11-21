// ---------------------------------------------------------------------------
// lib/validation.ts — Builder-side save validation for form templates (M4, FG11)
//
// The API contract in types/form-template.ts describes the SHAPE of a valid
// body. These helpers describe the RULES the builder enforces before sending
// one, so the author gets a precise message instead of a generic 422:
//   · every field needs a label, a fieldName and an inputKey
//   · inputKeys must be unique — they key the stored answers
//   · a RequestForm template needs a collection, a visible group and a watcher
//
// The rules match the legacy builder (`form-template-detail-view.tsx:219-228`).
// ---------------------------------------------------------------------------

import type { NewField, UpsertField } from '@/features/lms/types/form-template'

export type EditableField = NewField | UpsertField

export interface TemplateValidationInput {
  name: string
  fields: EditableField[]
  collectionId: string | null
  groups: unknown[]
  watchers: unknown[]
  /**
   * Whether the scope rules (groups + watchers) apply.
   *
   * The editor has the pickers for them, so it enforces them. The create page
   * has no scope UI yet — it creates the draft and hands over to the editor —
   * so it enforces only the rules it can satisfy.
   */
  requireScope?: boolean
}

export interface TemplateValidationResult {
  ok: boolean
  /** One message per problem, in the order the author should fix them. */
  errors: string[]
}

/**
 * Slugifies a label into a usable `inputKey`.
 *
 * Keeps the key ASCII and lower-case so it survives being used as a column
 * name, a JSON path segment and a URL query parameter unchanged. Vietnamese
 * diacritics are folded to their base letter ("Đặt phòng" → "dat_phong").
 */
export function slugifyLabel(label: string): string {
  const folded = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')

  return folded
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64)
}

/**
 * Derives a unique inputKey from a label.
 *
 * The `taken` set holds the inputKeys already used by other fields; the
 * numeric suffix keeps the key unique without making it unreadable.
 */
export function deriveInputKey(label: string, taken: Iterable<string>): string {
  const base = slugifyLabel(label) || 'field'
  const used = new Set(taken)

  if (!used.has(base)) return base

  let suffix = 2
  while (used.has(`${base}_${suffix}`)) suffix += 1
  return `${base}_${suffix}`
}

/**
 * Derives the internal field name from a label.
 *
 * The field name ends up as a property name on the stored payload, so it is
 * camelCase rather than the snake_case used for the inputKey.
 */
export function deriveFieldName(label: string): string {
  const words = slugifyLabel(label).split('_').filter(Boolean)
  if (words.length === 0) return 'field'

  return words
    .map((word, index) =>
      index === 0
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join('')
}

/**
 * Validates a template before it is saved.
 *
 * Returns every problem at once so the author can fix them in one pass rather
 * than discovering them one request at a time.
 */
export function validateTemplate(
  input: TemplateValidationInput,
): TemplateValidationResult {
  const errors: string[] = []

  if (!input.name.trim()) {
    errors.push('Tên biểu mẫu là bắt buộc.')
  }

  if (input.fields.length === 0) {
    errors.push('Biểu mẫu cần ít nhất một trường.')
  }

  const seenInputKeys = new Map<string, number>()
  const seenFieldNames = new Map<string, number>()

  input.fields.forEach((field, index) => {
    const position = index + 1

    if (!field.label.trim()) {
      errors.push(`Trường ${position}: nhãn hiển thị là bắt buộc.`)
    }
    if (!field.fieldName.trim()) {
      errors.push(`Trường ${position}: tên trường (field name) là bắt buộc.`)
    }
    if (!field.inputKey.trim()) {
      errors.push(`Trường ${position}: input key là bắt buộc.`)
    }

    const inputKey = field.inputKey.trim()
    if (inputKey) {
      const firstIndex = seenInputKeys.get(inputKey)
      if (firstIndex !== undefined) {
        errors.push(
          `Trường ${position}: input key "${inputKey}" bị trùng với trường ${firstIndex}.`,
        )
      } else {
        seenInputKeys.set(inputKey, position)
      }
    }

    const fieldName = field.fieldName.trim()
    if (fieldName) {
      const firstIndex = seenFieldNames.get(fieldName)
      if (firstIndex !== undefined) {
        errors.push(
          `Trường ${position}: tên trường "${fieldName}" bị trùng với trường ${firstIndex}.`,
        )
      } else {
        seenFieldNames.set(fieldName, position)
      }
    }
  })

  // FG11 / D12 — a request form is only usable once it is scoped: it must sit
  // in a collection, be visible to at least one group and have at least one
  // watcher, otherwise no request can be routed from it.
  if (!input.collectionId) {
    errors.push('Biểu mẫu phải thuộc một collection.')
  }
  if (input.requireScope === false) {
    return { ok: errors.length === 0, errors }
  }
  if (input.groups.length === 0) {
    errors.push('Biểu mẫu phải hiển thị cho ít nhất một nhóm.')
  }
  if (input.watchers.length === 0) {
    errors.push('Biểu mẫu phải có ít nhất một watcher.')
  }

  return { ok: errors.length === 0, errors }
}

/**
 * Strips the browser-only `clientId` before a field is sent to the API.
 *
 * The API has no `clientId` column; sending it would either be rejected or
 * silently dropped. It exists purely so the builder can address a
 * not-yet-persisted field with a stable key.
 */
export function toApiField<T extends EditableField>(
  field: T,
  displayOrder: number,
): Omit<T, 'clientId'> & { displayOrder: number } {
  const { clientId, ...rest } = field
  void clientId
  return { ...rest, displayOrder }
}
