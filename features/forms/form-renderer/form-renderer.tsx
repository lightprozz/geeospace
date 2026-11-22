"use client"
// ---------------------------------------------------------------------------
// components/form-renderer/form-renderer.tsx
// The ONE dynamic form renderer for FRM v2. Driven entirely by FieldSchema[] —
// submit, request detail and worklog-in-step all reuse it.
//
// Density: 'compact' (shadcn-minimize, h-9 inputs, two-column grid) or
//          'comfortable' (baseline, h-7 inputs, one column). Compact is
//          opt-in per page; the default stays the current behaviour so
//          callers that haven't been updated don't change visually.
// ---------------------------------------------------------------------------

import { Controller, type Control, type Path } from "react-hook-form"
import * as React from "react"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  resolveFieldType,
  validate,
  type FormValue,
} from "@/features/lms/lib/requests/field-value"
import { FieldType, type Field } from "@/features/lms/types/request"

import { FormGrid, FormRow, type FormRowWidth } from "./form-row"
import { resolveFieldRenderer } from "./field-registry"
import { fieldPath, visibleFields } from "./form-model"

/** Form state shape: one entry per field, keyed by `fieldPath(field)`. */
export type RequestFormValues = Record<string, FormValue>

export type FormRendererMode = "edit" | "readonly"
export type FormRendererDensity = "compact" | "comfortable"

interface FormRendererBaseProps {
  fields: Field[]
  className?: string
}

export type FormRendererProps = FormRendererBaseProps & {
  /**
   * Visual density. `compact` = shadcn-minimize, two-column grid for short
   * fields, h-9 inputs, tighter spacing. `comfortable` = baseline.
   */
  density?: FormRendererDensity
} & (
    | {
        mode: "readonly"
        control?: never
        disabled?: never
        onAttachmentFilesChange?: never
      }
    | {
        mode: "edit"
        /** From the caller's `useForm<RequestFormValues>`. */
        control: Control<RequestFormValues>
        disabled?: boolean
        /**
         * Attachment(6) only: browser Files chosen for the multipart parts.
         * They never enter the form value.
         */
        onAttachmentFilesChange?: (fieldId: string, files: File[]) => void
        /**
         * Attachment(6) only: blocks NEW uploads while keeping the stored
         * files visible. The worklog-step save endpoint is JSON-only, so a
         * file picked there could never be uploaded.
         */
        attachmentUploadDisabled?: boolean
      }
  )

export function FormRenderer(props: FormRendererProps) {
  const { fields, className, density = "comfortable" } = props
  const rendered = visibleFields(fields)

  if (props.mode === "readonly") {
    return (
      <FormGrid density={density} className={className}>
        {rendered.map((field) => (
          <FormRow key={field.id} width={fieldWidthHint(field, density)}>
            <ReadOnlyField field={field} density={density} />
          </FormRow>
        ))}
      </FormGrid>
    )
  }

  return (
    <FormGrid density={density} className={className}>
      {rendered.map((field) => (
        <FormRow key={field.id} width={fieldWidthHint(field, density)}>
          <EditableField
            field={field}
            control={props.control}
            disabled={props.disabled}
            density={density}
            onAttachmentFilesChange={props.onAttachmentFilesChange}
            attachmentUploadDisabled={props.attachmentUploadDisabled}
          />
        </FormRow>
      ))}
    </FormGrid>
  )
}

function ReadOnlyField({ field, density }: { field: Field; density: FormRendererDensity }) {
  const renderer = resolveFieldRenderer(resolveFieldType(field))
  const ids = fieldIds(field)

  return (
    <FieldRow field={field} ids={ids} grouped density={density}>
      <renderer.ReadOnly field={field} />
    </FieldRow>
  )
}

function EditableField({
  field,
  control,
  disabled,
  density,
  onAttachmentFilesChange,
  attachmentUploadDisabled,
}: {
  field: Field
  control: Control<RequestFormValues>
  disabled?: boolean
  density: FormRendererDensity
  onAttachmentFilesChange?: (fieldId: string, files: File[]) => void
  attachmentUploadDisabled?: boolean
}) {
  const ids = fieldIds(field)

  return (
    <Controller
      control={control}
      name={fieldPath(field) as Path<RequestFormValues>}
      rules={{ validate: (value) => validate(field, value) ?? true }}
      render={({ field: rhf, fieldState }) => {
        // The contested 12..15 range is resolved from the LIVE value, so a
        // field whose shape only becomes clear after editing still lands on
        // the right component.
        const renderer = resolveFieldRenderer(
          resolveFieldType(field, rhf.value),
        )
        const error = fieldState.error?.message

        return (
          <FieldRow
            field={field}
            ids={ids}
            grouped={renderer.grouped}
            error={error}
            density={density}
          >
            <renderer.Input
              field={field}
              value={rhf.value}
              onChange={(value) => rhf.onChange(value as FormValue)}
              onBlur={rhf.onBlur}
              disabled={disabled}
              inputId={ids.input}
              labelledBy={renderer.grouped ? ids.label : undefined}
              describedBy={describedBy(ids, field, error)}
              invalid={Boolean(error)}
              density={density}
              onFilesChange={
                onAttachmentFilesChange
                  ? (files) => onAttachmentFilesChange(field.id, files)
                  : undefined
              }
              attachmentUploadDisabled={attachmentUploadDisabled}
            />
          </FieldRow>
        )
      }}
    />
  )
}

/**
 * Label + required marker + description + error, identical for every type, so
 * accessibility wiring cannot drift between field components.
 */
function FieldRow({
  field,
  ids,
  grouped,
  error,
  density,
  children,
}: {
  field: Field
  ids: FieldIds
  grouped?: boolean
  error?: string
  density: FormRendererDensity
  children: React.ReactNode
}) {
  const text = field.label?.trim() || field.fieldName
  const isCompact = density === "compact"
  const marker = field.required ? (
    <>
      {" "}
      <span aria-hidden="true" className="text-destructive">
        *
      </span>
      <span className="sr-only">(required)</span>
    </>
  ) : null

  return (
    <div className="flex flex-col gap-1.5">
      {/* `<label for>` may only point at a labelable control; grouped fields
          get a plain node the component references with aria-labelledby. */}
      {grouped ? (
        <span
          id={ids.label}
          className={cn(
            "leading-none font-medium",
            isCompact ? "text-xs" : "text-sm",
          )}
        >
          {text}
          {marker}
        </span>
      ) : (
        <Label
          id={ids.label}
          htmlFor={ids.input}
          className={cn(isCompact ? "text-xs" : "text-sm")}
        >
          {text}
          {marker}
        </Label>
      )}

      {field.description && (
        <p
          id={ids.description}
          className={cn("text-muted-foreground", isCompact ? "text-[11px]" : "text-xs")}
        >
          {field.description}
        </p>
      )}

      {children}

      {error && (
        <p id={ids.error} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Width hint — decide whether a field may share a row with the next field.
// ---------------------------------------------------------------------------

/** Returns "short" if the field may share a row with the next short field. */
function fieldWidthHint(field: Field, density: FormRendererDensity): FormRowWidth {
  if (density === "comfortable") return "full"
  // Only short input types qualify: text-like, number, date, dropdown,
  // single checkbox. LongText, Attachment, MultipleCheckbox, Rating stay
  // full-width so they can expand to a sensible height.
  //
  // The switch runs on `resolveFieldType(field)` — NOT on `field.type`. The
  // declared number is ambiguous for 12..15 (the BE resolves those by value
  // shape at runtime), so a raw-number switch would pair a PhoneNumber with a
  // PickStudentWithClass depending on which row the template happened to
  // store. `resolveFieldType` is the single narrowing every other module uses.
  switch (resolveFieldType(field)) {
    case FieldType.ShortText:
    case FieldType.Date:
    case FieldType.Dropdown:
    case FieldType.CheckBox:
    case FieldType.Email:
    case FieldType.Number:
    case FieldType.PickUser:
    case FieldType.PickStudent:
    case FieldType.PickClass:
    case FieldType.PhoneNumber:
    case FieldType.Facilities:
    case FieldType.PickStudentWithClass:
      return "short"
    default:
      return "full"
  }
}

// ---------------------------------------------------------------------------
// ids
// ---------------------------------------------------------------------------

interface FieldIds {
  input: string
  label: string
  description: string
  error: string
}

/** Stable and DOM-safe: derived from the same sanitized key RHF uses. */
function fieldIds(field: Field): FieldIds {
  const base = fieldPath(field)
  return {
    input: base,
    label: `${base}-label`,
    description: `${base}-description`,
    error: `${base}-error`,
  }
}

function describedBy(
  ids: FieldIds,
  field: Field,
  error?: string,
): string | undefined {
  const parts = [
    field.description ? ids.description : null,
    error ? ids.error : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(" ") : undefined
}
