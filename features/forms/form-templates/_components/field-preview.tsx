'use client'
// ---------------------------------------------------------------------------
// _components/field-preview.tsx
// Readonly preview of fields using the existing FormRenderer.
// ---------------------------------------------------------------------------

import { FormRenderer } from "@/features/forms/form-renderer/form-renderer"
import type { Field } from '@/features/lms/types/form-template'

interface FieldPreviewProps {
  fields: Field[]
  className?: string
}

export function FieldPreview({ fields, className }: FieldPreviewProps) {
  return (
    <div className={className}>
      <FormRenderer fields={fields} mode="readonly" />
    </div>
  )
}
