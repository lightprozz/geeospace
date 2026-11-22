// ---------------------------------------------------------------------------
// hooks/use-worklog-templates.ts — TanStack Query hooks for WorkLog templates
// Sub-2 hook: fetchPublishedWorkLogTemplates for step editor worklog picker
// ---------------------------------------------------------------------------

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchWorkLogTemplates,
  fetchWorkLogTemplate,
  fetchPublishedWorkLogTemplates,
  updateWorkLogTemplate,
  toggleWorkLogTemplateActivate,
  setWorkLogTemplateActive,
  type WorkLogTemplatesOptions,
} from '@/features/lms/lib/form-templates/api'

export function useWorkLogTemplatesQuery(options: WorkLogTemplatesOptions = {}) {
  return useQuery({
    queryKey: ['worklog-templates', 'list', options],
    queryFn: () => fetchWorkLogTemplates(options),
  })
}

export function useWorkLogTemplateQuery(id: string) {
  return useQuery({
    queryKey: ['worklog-templates', id],
    queryFn: () => fetchWorkLogTemplate(id),
    enabled: !!id,
  })
}

export function usePublishedWorkLogTemplatesQuery() {
  return useQuery({
    queryKey: ['worklog-templates', 'published'],
    queryFn: fetchPublishedWorkLogTemplates,
  })
}

export function useWorkLogTemplateMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      request,
      ifUnmodifiedSince,
    }: {
      id: string
      request: Parameters<typeof updateWorkLogTemplate>[1]
      ifUnmodifiedSince?: string
    }) => {
      return updateWorkLogTemplate(id, request, ifUnmodifiedSince)
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['worklog-templates'] })
      queryClient.setQueryData(['worklog-templates', id], (old: unknown) => {
        // Update cache with new data
        return old
      })
    },
  })
}

export function useToggleWorkLogTemplateMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ifUnmodifiedSince,
    }: {
      id: string
      ifUnmodifiedSince?: string
    }) => {
      return toggleWorkLogTemplateActivate(id, ifUnmodifiedSince)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worklog-templates'] })
    },
  })
}

/**
 * Sets the active flag to an explicit target state.
 *
 * Preferred over the toggle mutation because the caller states the target:
 * a toggle flips whatever the server currently holds, which races with a
 * stale client view.
 */
export function useSetWorkLogTemplateActiveMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      isActive,
    }: {
      id: string
      isActive: boolean
    }) => {
      return setWorkLogTemplateActive(id, isActive)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worklog-templates'] })
    },
  })
}
