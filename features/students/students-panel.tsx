'use client'

import { LmsUiScope } from '@/components/ui/lms-ui-scope'
import { PermissionGuard } from '@/components/auth/permission-guard'
import { PERMISSIONS } from '@/lib/permissions'
import { useWindowNavigation } from '@/components/desktop/window-navigation'
import { StudentsPageClient } from './students-page-client'
import { StudentInfoClient } from './student-info-client'

export function StudentsPanel() {
  const { path } = useWindowNavigation()
  const studentId = path.split('/').filter(Boolean)[0]
  return <LmsUiScope className="h-full min-h-0 overflow-hidden" data-window-path={path || '/'}>
    <PermissionGuard permission={PERMISSIONS.STUDENT_READ}>
      {studentId ? <StudentInfoClient key={studentId} studentId={studentId} /> : <StudentsPageClient />}
    </PermissionGuard>
  </LmsUiScope>
}
