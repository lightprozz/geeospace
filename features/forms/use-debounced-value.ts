'use client'
// ---------------------------------------------------------------------------
// hooks/use-debounced-value.ts
// Debounces a rapidly changing value (a search box) so a server-side lookup
// is issued once the user pauses, instead of on every keystroke.
// ---------------------------------------------------------------------------

import * as React from 'react'

/**
 * Returns `value` after it has stopped changing for `delay` milliseconds.
 * The pending timer is cleared on unmount, so a debounce in flight never
 * fires against an unmounted component.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = React.useState(value)

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
