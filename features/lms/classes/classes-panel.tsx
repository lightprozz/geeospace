'use client'

import { useEffect, useState } from 'react'
import { LmsUiScope } from '@/components/ui/lms-ui-scope'
import { TooltipProvider } from '@/components/ui/tooltip'
import { PermissionGuard } from '@/components/auth/permission-guard'
import { PERMISSIONS } from '@/lib/permissions'
import { onAuthReset, useAuthStore } from '@/stores/use-auth-store'
import { useWindowNavigation } from '@/components/desktop/window-navigation'
import { ClassesPageClient } from './classes-page-client'
import { ClassDetailClient } from './class-detail-client'
import { parseClassPath } from './navigation'
import { clearClassDrafts, prepareClassDraftSession } from './draft-session'

onAuthReset(clearClassDrafts)

export default function ClassesPanel() {
  const identity = useAuthStore(state => state.user?.sub ?? '')
  const [draftIdentity, setDraftIdentity] = useState<string | null>(null)
  useEffect(() => {
    try { prepareClassDraftSession(identity, window.localStorage) }
    catch { clearClassDrafts() }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftIdentity(identity)
  }, [identity])
  const { path } = useWindowNavigation()
  const { classId } = parseClassPath(path)
  if (draftIdentity !== identity) return null
  return <PermissionGuard permission={PERMISSIONS.CLASS_READ}><LmsUiScope className="h-full min-h-0 overflow-auto"><TooltipProvider>
    {classId ? <ClassDetailClient key={classId} classId={classId} /> : <ClassesPageClient />}
  </TooltipProvider></LmsUiScope></PermissionGuard>
}
