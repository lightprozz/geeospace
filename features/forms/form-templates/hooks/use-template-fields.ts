'use client'
// ---------------------------------------------------------------------------
// hooks/use-template-fields.ts
// TanStack Query read hook for template fields.
// ---------------------------------------------------------------------------

import { useQuery } from "@tanstack/react-query"
import { getFields } from "../lib/api"

export const fieldKeys = {
  all: ["template-fields"] as const,
  list: (templateId: string) => [...fieldKeys.all, templateId] as const,
}

export function useTemplateFields(templateId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: fieldKeys.list(templateId),
    queryFn: () => getFields(templateId),
    enabled: options?.enabled ?? (templateId != null),
  })
}
