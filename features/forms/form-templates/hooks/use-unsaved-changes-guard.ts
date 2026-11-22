'use client'
// ---------------------------------------------------------------------------
// hooks/use-unsaved-changes-guard.ts
// Guards unsaved builder edits against navigation (M2).
//
// Two kinds of "leaving" have to be covered:
//   1. A hard unload (tab close / reload). The browser owns the prompt, so
//      the handler only sets `returnValue`.
//   2. An in-app route change (a sidebar link, a breadcrumb, the Cancel
//      button). Next.js 16 exposes no navigation-blocking API, so the hook
//      intercepts anchor clicks in the capture phase and turns them into a
//      pending navigation the caller confirms through its own dialog.
//
// The hook deliberately does not own a dialog component: the builder already
// has an `AlertDialog` surface, and the caller decides whether "leave" means
// "discard" or "stay".
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from 'react'

export interface UnsavedChangesGuard {
  /** Route the user tried to reach, or `null` when no dialog is pending. */
  pendingHref: string | null
  /** Ask for confirmation before navigating to `href`. */
  requestLeave: (href: string) => void
  /** Perform the pending navigation. */
  confirmLeave: () => void
  /** Dismiss the pending navigation and stay on the page. */
  cancelLeave: () => void
}

/**
 * @param isDirty  whether the page holds edits that are not persisted
 * @param onLeave  invoked with the confirmed href once the user approves
 */
export function useUnsavedChangesGuard(
  isDirty: boolean,
  onLeave: (href: string) => void,
): UnsavedChangesGuard {
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  // `onLeave` is read through a ref so the click interceptor does not need to
  // be re-registered whenever the caller re-creates its handler. The ref is
  // synced in an effect, never during render.
  const onLeaveRef = useRef(onLeave)
  useEffect(() => {
    onLeaveRef.current = onLeave
  }, [onLeave])

  // ---- Hard unload (tab close, reload) --------------------------------------
  useEffect(() => {
    if (!isDirty) return

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // Legacy browsers need a truthy `returnValue` to show the prompt.
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // ---- In-app navigation ----------------------------------------------------
  // Anchor clicks are intercepted in the capture phase so the router never
  // sees them. Same-origin links only: an external link (a new tab, a
  // download) is not a route change, and the browser's own unload prompt
  // covers it.
  useEffect(() => {
    if (!isDirty) return

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return
      // Let the user open the link in a new tab without a prompt.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      if (event.button !== 0) return

      const anchor = (event.target as HTMLElement | null)?.closest('a')
      if (!anchor) return
      if (!anchor.closest('[data-forms-window="/form-templates"]')) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#')) return
      if (anchor.target && anchor.target !== '_self') return
      if (anchor.dataset.allowUnsavedNavigation !== undefined) return

      // Only same-origin routes are guarded; absolute URLs pointing elsewhere
      // are left to the browser.
      if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) return

      event.preventDefault()
      setPendingHref(href)
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [isDirty])

  const requestLeave = useCallback((href: string) => {
    setPendingHref(href)
  }, [])

  const cancelLeave = useCallback(() => {
    setPendingHref(null)
  }, [])

  const confirmLeave = useCallback(() => {
    const href = pendingHref
    setPendingHref(null)
    if (href) onLeaveRef.current(href)
  }, [pendingHref])

  return { pendingHref, requestLeave, confirmLeave, cancelLeave }
}
