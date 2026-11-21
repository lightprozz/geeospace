'use client'
// ---------------------------------------------------------------------------
// hooks/requests/use-available-templates.ts
// TanStack Query read hooks for the submit-side templates.
// CLIENT-ONLY — 'use client' required for hooks.
// ---------------------------------------------------------------------------

import { useQuery } from '@tanstack/react-query'
import { fetchAvailableTemplates, fetchSubmitTemplate } from '@/features/lms/lib/requests/api'
import { requestKeys } from '@/features/lms/lib/requests/query-keys'

/**
 * GET /templates/available?collectionId= — published templates the caller may
 * submit. Scope (group membership OR campus assignment) is resolved
 * server-side; the returned list is already filtered.
 */
export function useAvailableTemplates(
  collectionId?: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: requestKeys.availableTemplates(collectionId),
    queryFn: () => fetchAvailableTemplates(collectionId),
    enabled: options?.enabled ?? true,
  })
}

/**
 * GET /templates/{id}/for-submit — template + typed fields to render the
 * submit form. Seed form state with `decode(field)` from
 * lib/requests/field-value.ts. 404 when the template is out of scope.
 */
export function useSubmitTemplate(id: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: requestKeys.submitTemplate(id ?? ''),
    queryFn: () => fetchSubmitTemplate(id!),
    enabled: (options?.enabled ?? true) && !!id,
  })
}
