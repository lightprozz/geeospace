'use client'

import { LmsUiScope } from '@/components/ui/lms-ui-scope'
import { useWindowNavigation } from '@/components/desktop/window-navigation'
import { StudentsPageClient } from './students-page-client'
import { StudentInfoClient } from './student-info-client'

export function StudentsPanel() {
  const { path } = useWindowNavigation()
  const studentId = path.split('/').filter(Boolean)[0]
  return <LmsUiScope className="h-full min-h-0 overflow-hidden" data-window-path={path || '/'}>
    {studentId ? <StudentInfoClient key={studentId} studentId={studentId} /> : <StudentsPageClient />}
  </LmsUiScope>
}
