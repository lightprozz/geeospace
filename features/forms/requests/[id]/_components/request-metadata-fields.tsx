'use client'
// ---------------------------------------------------------------------------
// _components/request-metadata-fields.tsx
// Renders the request's dynamic fields in read-only mode via FormRenderer.
// ---------------------------------------------------------------------------

import { FormRenderer } from "@/features/forms/form-renderer/form-renderer"
import type { Field } from "@/features/lms/types/request"

interface RequestMetadataFieldsProps {
  fields: Field[]
}

export function RequestMetadataFields({ fields }: RequestMetadataFieldsProps) {
  if (!fields.length) return null

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-col gap-5 p-5">
        <FormRenderer mode="readonly" fields={fields} density="compact" />
      </div>
    </div>
  )
}
