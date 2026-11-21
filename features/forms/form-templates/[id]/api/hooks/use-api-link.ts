// ---------------------------------------------------------------------------
// api/hooks/use-api-link.ts — TanStack Query hooks for the inbound API link
// ---------------------------------------------------------------------------

'use client'

import { useQuery } from '@tanstack/react-query'
import { ApiError } from '@/lib/api-client'
import { fetchTemplateApiHistory, fetchTemplateApiLink } from '../lib/api'

export const apiLinkKeys = {
  all: ['form-templates', 'api-link'] as const,
  link: (templateId: string) => [...apiLinkKeys.all, 'link', templateId] as const,
  history: (templateId: string) => [...apiLinkKeys.all, 'history', templateId] as const,
}

/**
 * The template's inbound API link.
 *
 * A template that has never been written through v2 has no link yet, and the BE
 * answers 404 for it. That is an expected state, not a failure, so the query
 * reports it as "no link" instead of an error.
 */
export function useTemplateApiLinkQuery(templateId: string) {
  return useQuery({
    queryKey: apiLinkKeys.link(templateId),
    queryFn: async () => {
      try {
        return await fetchTemplateApiLink(templateId)
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null
        }
        throw error
      }
    },
    enabled: !!templateId,
  })
}

/** The requests submitted through the template's inbound API link. */
export function useTemplateApiHistoryQuery(templateId: string) {
  return useQuery({
    queryKey: apiLinkKeys.history(templateId),
    queryFn: () => fetchTemplateApiHistory(templateId),
    enabled: !!templateId,
  })
}
