'use client'

import { useMemo, type ReactNode } from 'react'
import { useWindowNavigation } from '@/components/desktop/window-navigation'
import { usePermissionStore } from '@/stores/use-permission-store'

export function useStudentPermission() {
  const permissions = usePermissionStore(s => s.permissions)
  return { can: (permission: string) => permissions.includes(permission) }
}

export function useStudentNavigation() {
  const { navigate, back } = useWindowNavigation()
  return useMemo(() => ({
    push: (path: string) => navigate(path.replace(/^\/students\/?/, '')),
    back,
  }), [navigate, back])
}

export function renderStudentsHeader({ breadcrumbs, actions }: { breadcrumbs: ReactNode; actions?: ReactNode }, _key?: string) {
  return <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-3">{breadcrumbs}{actions}</header>
}
