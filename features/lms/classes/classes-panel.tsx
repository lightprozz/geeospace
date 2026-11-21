'use client'

import { LmsUiScope } from '@/components/ui/lms-ui-scope'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { useWindowNavigation } from '@/components/desktop/window-navigation'
import { ClassesPageClient } from './classes-page-client'
import { ClassDetailClient } from './class-detail-client'
import { TempLmsWiring } from './temp-lms-wiring'
import { parseClassPath } from './navigation'

export default function ClassesPanel() {
  const { path } = useWindowNavigation()
  const { classId } = parseClassPath(path)
  return <TempLmsWiring><LmsUiScope className="h-full min-h-0 overflow-auto"><TooltipProvider>
    {classId ? <ClassDetailClient key={classId} classId={classId} /> : <ClassesPageClient />}
    <Toaster />
  </TooltipProvider></LmsUiScope></TempLmsWiring>
}
