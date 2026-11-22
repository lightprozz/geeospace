'use client'
// ---------------------------------------------------------------------------
// hooks/use-templates.ts
// TanStack Query read hooks for the FRM v2 form-builder templates list.
// ---------------------------------------------------------------------------

import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { getTemplates, type TemplateListParams } from "../lib/api"
import { templateKeys } from "./use-template"

export function useTemplates(params: TemplateListParams = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: templateKeys.list(params),
    queryFn: () => getTemplates(params),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  })
}
