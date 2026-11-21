// ---------------------------------------------------------------------------
// components/form-renderer/field-registry.ts
// FieldType -> { Input, ReadOnly }. The ONLY place a field type maps to a
// component: form-renderer.tsx never switches on type.
//
// The key is the EFFECTIVE type from `resolveFieldType` (shape-first for the
// contested 12..15 range), and an unknown legacy number falls back to the text
// pair — exactly how FormFieldJsonMapper treats it.
// ---------------------------------------------------------------------------

import { FieldType, type FieldTypeValue } from "@/features/lms/types/request"

import type { FieldRenderer } from "./field-props"
import {
  AttachmentFieldInput,
  AttachmentFieldReadOnly,
} from "./fields/attachment-field"
import {
  CheckBoxFieldInput,
  CheckBoxFieldReadOnly,
} from "./fields/checkbox-field"
import { DateFieldInput, DateFieldReadOnly } from "./fields/date-field"
import {
  DegradedPickerFieldInput,
  DegradedPickerFieldReadOnly,
} from "./fields/degraded-picker-field"
import {
  DropdownFieldInput,
  DropdownFieldReadOnly,
} from "./fields/dropdown-field"
import {
  LongTextFieldInput,
  LongTextFieldReadOnly,
} from "./fields/long-text-field"
import {
  MultiCheckBoxFieldInput,
  MultiCheckBoxFieldReadOnly,
} from "./fields/multi-checkbox-field"
import { NumberFieldInput, NumberFieldReadOnly } from "./fields/number-field"
import {
  PickClassFieldInput,
  PickClassFieldReadOnly,
} from "./fields/pick-class-field"
import { RatingFieldInput, RatingFieldReadOnly } from "./fields/rating-field"
import { TextFieldInput, TextFieldReadOnly } from "./fields/text-field"

const TEXT_RENDERER: FieldRenderer = {
  Input: TextFieldInput,
  ReadOnly: TextFieldReadOnly,
}

/** Read-only in BOTH modes — see fields/degraded-picker-field.tsx. */
const DEGRADED_PICKER_RENDERER: FieldRenderer = {
  Input: DegradedPickerFieldInput,
  ReadOnly: DegradedPickerFieldReadOnly,
  grouped: true,
}

export const FIELD_REGISTRY: Readonly<Record<FieldTypeValue, FieldRenderer>> = {
  [FieldType.ShortText]: TEXT_RENDERER,
  [FieldType.LongText]: {
    Input: LongTextFieldInput,
    ReadOnly: LongTextFieldReadOnly,
  },
  [FieldType.Date]: { Input: DateFieldInput, ReadOnly: DateFieldReadOnly },
  [FieldType.Dropdown]: {
    Input: DropdownFieldInput,
    ReadOnly: DropdownFieldReadOnly,
  },
  [FieldType.CheckBox]: {
    Input: CheckBoxFieldInput,
    ReadOnly: CheckBoxFieldReadOnly,
  },
  [FieldType.MultipleCheckBox]: {
    Input: MultiCheckBoxFieldInput,
    ReadOnly: MultiCheckBoxFieldReadOnly,
    grouped: true,
  },
  [FieldType.Attachment]: {
    Input: AttachmentFieldInput,
    ReadOnly: AttachmentFieldReadOnly,
  },
  [FieldType.Email]: TEXT_RENDERER,
  [FieldType.Number]: {
    Input: NumberFieldInput,
    ReadOnly: NumberFieldReadOnly,
  },
  [FieldType.PickUser]: DEGRADED_PICKER_RENDERER,
  [FieldType.PickStudent]: DEGRADED_PICKER_RENDERER,
  [FieldType.PickClass]: {
    Input: PickClassFieldInput,
    ReadOnly: PickClassFieldReadOnly,
  },
  [FieldType.PhoneNumber]: TEXT_RENDERER,
  [FieldType.Facilities]: DEGRADED_PICKER_RENDERER,
  [FieldType.Rating]: {
    Input: RatingFieldInput,
    ReadOnly: RatingFieldReadOnly,
    grouped: true,
  },
  [FieldType.PickStudentWithClass]: DEGRADED_PICKER_RENDERER,
}

/**
 * The renderer for an EFFECTIVE type. A legacy type number outside 0..15 gets
 * the text pair rather than blowing up the whole request detail.
 */
export function resolveFieldRenderer(type: number): FieldRenderer {
  return FIELD_REGISTRY[type as FieldTypeValue] ?? TEXT_RENDERER
}
