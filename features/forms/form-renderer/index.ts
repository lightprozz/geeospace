// ---------------------------------------------------------------------------
// components/form-renderer/index.ts
// Public surface of the shared FRM v2 form renderer.
// ---------------------------------------------------------------------------

export {
  FormRenderer,
  type FormRendererProps,
  type FormRendererMode,
  type FormRendererDensity,
  type RequestFormValues,
} from "./form-renderer"

export { FormRow, FormGrid, type FormRowWidth } from "./form-row"
export { fieldInputClass, fieldBlockClass } from "./field-density"

export {
  buildDefaultValues,
  fieldPath,
  findDegradedPickerBlockers,
  visibleFields,
  type DegradedPickerBlocker,
} from "./form-model"

export { FIELD_REGISTRY, resolveFieldRenderer } from "./field-registry"

export type {
  FieldInputProps,
  FieldReadOnlyProps,
  FieldRenderer,
} from "./field-props"
