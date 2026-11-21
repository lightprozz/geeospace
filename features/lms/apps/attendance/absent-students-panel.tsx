'use client'
// ---------------------------------------------------------------------------
// app/(dashboard)/attendance/_components/absent-students-panel.tsx
// Left panel (¼ width): scrollable list of absent students
// Uses shadcn Card, Badge, ScrollArea, Skeleton
// ---------------------------------------------------------------------------

import { Calendar as CalendarIcon, Users } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useAbsentStudents } from '@/features/lms/hooks/attendance/use-attendance'
import { useCatchUpDialog } from '@/features/lms/stores/use-attendance-store'
import { usePermission } from '@/components/auth/permission-guard'
import { PERMISSIONS } from '@/lib/permissions'
import { AttendanceEmptyState } from './attendance-empty-state'
import { cn } from '@/lib/utils'
import { shortenName } from '@/features/lms/lib/attendance/display-name'

interface AbsentStudentsPanelProps {
  teacherId: string | undefined
  dateRange: { start: string; end: string }
}

export function AbsentStudentsPanel({
  teacherId,
}: AbsentStudentsPanelProps) {
  const { data: students, isLoading } = useAbsentStudents(teacherId)
  const { openCreateCatchUp } = useCatchUpDialog()
  const { can } = usePermission()
  const canCreateCatchUp = can(PERMISSIONS.ATTENDANCE_CATCHUP_WRITE)

  return (
    <Card className="flex h-full flex-col gap-0 overflow-hidden py-0">
      <CardHeader className="flex h-9 shrink-0 items-center border-b px-4 [.border-b]:pb-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-primary" />
          Absent Students
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2 rounded-lg border p-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : !students?.length ? (
          <AttendanceEmptyState type="students" />
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-3 p-4">
              {students.map((student, idx) => (
                <div
                  key={`${student.studentName}-${idx}`}
                  className={cn(
                    'rounded-lg border border-border bg-background p-3 text-left transition-colors',
                    canCreateCatchUp && 'cursor-pointer hover:border-primary/30 hover:shadow-sm',
                  )}
                  onClick={canCreateCatchUp ? () => openCreateCatchUp(student.studentName) : undefined}
                  role={canCreateCatchUp ? 'button' : undefined}
                  tabIndex={canCreateCatchUp ? 0 : undefined}
                  onKeyDown={
                    canCreateCatchUp
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') openCreateCatchUp(student.studentName)
                        }
                      : undefined
                  }
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {shortenName(student.studentName)}
                    </span>
                    <Badge
                      variant="secondary"
                      className="shrink-0 max-w-[120px] truncate text-[10px]"
                      title={student.class}
                    >
                      {student.class}
                    </Badge>
                  </div>
                  {student.englishName && (
                    <div className="mb-2 text-xs text-muted-foreground">
                      {student.englishName}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 rounded bg-rose-50 px-2 py-1 text-xs text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 w-max">
                    <CalendarIcon className="h-3 w-3" />
                    <span>Absent</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
