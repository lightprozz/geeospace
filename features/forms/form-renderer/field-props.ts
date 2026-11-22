// ---------------------------------------------------------------------------
// components/form-renderer/field-props.ts
// The ONE props contract every per-type field component implements. Kept in a
// leaf module so `field-registry.ts` can import the components and the
// components can import these types without a runtime cycle.
//
// Field components render the CONTROL only — label, required marker,
// description and the error node are owned by `form-renderer.tsx` so every
// type gets identical accessibility wiring.
// ---------------------------------------------------------------------------

import type { ComponentType } from "react"

import type { Field } from "@/features/lms/types/request"

/** Visual density. Mirrors FormRendererDensity; duplicated here to avoid
 *  a cycle between field-props and form-renderer. */
export type FieldDensity = "compact" | "comfortable"

export interface FieldInputProps {
  /** The field descriptor straight off the API. */
  field: Field
  /**
   * Current form value in `decode()` shape. Components pass it back through
   * `decode(field, value)` rather than narrowing it by hand — per-type value
   * logic lives only in lib/requests/field-value.
   */
  value: unknown
  onChange: (value: unknown) => void
  onBlur: () => void
  disabled?: boolean
  /** The id the control MUST carry — the rendered <label> points at it. */
  inputId: string
  /**
   * Id of the rendered label. Only set for `grouped` renderers, which have no
   * single labelable control and must instead put `aria-labelledby` on the
   * container that wraps their controls.
   */
  labelledBy?: string
  /** Pre-joined ids of the description / error nodes, or undefined. */
  describedBy?: string
  /** True once RHF has a validation message for this field. */
  invalid: boolean
  /**
   * Visual density. Defaults to "comfortable" so existing callers compile
   * unchanged. "compact" makes the control h-9 (36px) with the rest of the
   * shadcn-minimize treatment.
   */
  density?: FieldDensity
  /**
   * Attachment(6) only. Browser `File`s never enter the form value (they would
   * encode as blank `{url:"",fileName:""}` entries) — they travel in the
   * multipart parts of the submit, so the caller collects them here.
   */
  onFilesChange?: (files: File[]) => void
  /**
   * Attachment(6) only. Blocks NEW uploads while keeping the already-stored
   * files visible. The worklog-step save endpoint is JSON-only, so a file
   * picked there could never be uploaded — the picker has to be closed, and
   * saying so beats silently swallowing the file.
   */
  attachmentUploadDisabled?: boolean
}

export interface FieldReadOnlyProps {
  field: Field
  /** Defaults to `field.value` when the caller has no form state. */
  value?: unknown
}

/** Exactly one pair per field type — the renderer never switches on type. */
export interface FieldRenderer {
  Input: ComponentType<FieldInputProps>
  ReadOnly: ComponentType<FieldReadOnlyProps>
  /**
   * True when the Input renders a SET of controls (or none at all) instead of
   * one labelable element. `<label for>` may only point at a labelable
   * element, so the renderer emits a plain labelling node and hands the
   * component `labelledBy` for `aria-labelledby` instead.
   */
  grouped?: boolean
}
