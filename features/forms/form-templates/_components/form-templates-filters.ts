// ---------------------------------------------------------------------------
// form-templates-filters.ts — URL-shareable filter state via nuqs v2
//
// nuqs v2: useQueryState(key) returns [value, setter] where value is
// string | null. We wrap each hook to provide typed return values.
// ---------------------------------------------------------------------------

import { useQueryState } from '@/features/forms/window-adapter'
import { useCallback } from 'react'

/** Collection filter — null = all collections. */
export function useCollectionFilter(): [
  string | null,
  (id: string | null) => void,
] {
  const [value, setValue] = useQueryState('collection')
  const setter = useCallback(
    (id: string | null) => setValue(id),
    [setValue],
  )
  return [value as string | null, setter]
}

/** Current page — string, coerced to int at consumer. */
export function usePageFilter(): [
  string | null,
  (page: string | null) => void,
] {
  const [value, setValue] = useQueryState('page')
  const setter = useCallback(
    (page: string | null) => setValue(page),
    [setValue],
  )
  return [value as string | null, setter]
}
