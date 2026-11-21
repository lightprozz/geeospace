'use client'
// ---------------------------------------------------------------------------
// app/(dashboard)/attendance/_components/events-table-panel.tsx
// Right panel (¾ width): SingleLesson events table with CRUD actions
// Uses shadcn Table, Card, Badge, Checkbox, DropdownMenu, AlertDialog, Button
// ---------------------------------------------------------------------------

import { useState } from 'react'
import {
  Calendar as CalendarIcon,
  Edit2,
  Copy,
  Archive,
  Trash2,
  CheckCircle2,
  MoreHorizontal,
} from 'lucide-react'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'

import {
  useSingleLessons,
  useDeleteSingleLesson,
  useArchiveSingleLesson,
  useApproveSingleLesson,
  useCreateSingleLesson,
} from '@/features/lms/hooks/attendance/use-attendance'
import {
  useEventDialog,
  useAttendanceFilters,
} from '@/features/lms/stores/use-attendance-store'
import { usePermission } from '@/components/auth/permission-guard'
import { PERMISSIONS } from '@/lib/permissions'
import { SINGLE_LESSON_TYPE_OPTIONS } from '@/features/lms/types/attendance'
import type { SingleLessonDto } from '@/features/lms/types/attendance'
import { AttendanceEmptyState } from './attendance-empty-state'

/** Map type value to badge variant color */
function getTypeBadgeClasses(type: number): string {
  switch (type) {
    case 1:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
    case 2:
      return 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
    case 3:
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
    case 4:
      return 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300'
    default:
      return ''
  }
}

export function EventsTablePanel() {
  const { data: lessons, isLoading } = useSingleLessons()
  const { showArchived, toggleShowArchived } = useAttendanceFilters()
  const { openEditEvent } = useEventDialog()

  const { can } = usePermission()
  const canEventWrite = can(PERMISSIONS.ATTENDANCE_EVENT_WRITE)
  const canEventArchive = can(PERMISSIONS.ATTENDANCE_EVENT_ARCHIVE)
  const canEventApprove = can(PERMISSIONS.ATTENDANCE_EVENT_APPROVE)
  const canEventDelete = can(PERMISSIONS.ATTENDANCE_EVENT_DELETE)
  const hasAnyEventAction = canEventWrite || canEventArchive || canEventApprove || canEventDelete

  const deleteMutation = useDeleteSingleLesson()
  const archiveMutation = useArchiveSingleLesson()
  const approveMutation = useApproveSingleLesson()
  const createMutation = useCreateSingleLesson()

  // AlertDialog state
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete' | 'approve'
    lesson: SingleLessonDto
  } | null>(null)

  // Filter by archived status — safeguard against non-array API responses
  const lessonsArray = Array.isArray(lessons) ? lessons : []
  const displayedEvents = lessonsArray.filter(
    (e) => showArchived || !e.isArchived,
  )

  const handleDuplicate = (event: SingleLessonDto) => {
    createMutation.mutate({
      name: `${event.name} (Copy)`,
      type: event.type,
      roomId: event.roomId ?? '',
      branchId: event.branchId ?? '',
      startTime: event.startTime,
      endTime: event.endTime,
      studentIds: event.studentIds,
      teacherIds: event.teacherIds,
    })
  }

  const handleConfirm = () => {
    if (!confirmAction) return

    if (confirmAction.type === 'delete') {
      deleteMutation.mutate(confirmAction.lesson.id)
    } else if (confirmAction.type === 'approve') {
      approveMutation.mutate(confirmAction.lesson.id)
    }
    setConfirmAction(null)
  }

  const getTypeLabel = (type: number) =>
    SINGLE_LESSON_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? 'Unknown'

  return (
    <>
      <Card className="flex h-full flex-col gap-0 overflow-hidden py-0">
        <CardHeader className="flex h-9 shrink-0 items-center border-b px-4">
          <div className="flex w-full items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarIcon className="h-4 w-4 text-primary" />
              Scheduled Events
            </CardTitle>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={showArchived}
                onCheckedChange={toggleShowArchived}
              />
              Show Archived
            </label>
          </div>
        </CardHeader>

        <CardContent className="relative flex-1 overflow-hidden p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : displayedEvents.length === 0 ? (
            <AttendanceEmptyState type="events" />
          ) : (
            <div className="h-full overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="h-10 px-4 font-medium">
                      Name
                    </TableHead>
                    <TableHead className="h-10 px-4 font-medium">
                      Type
                    </TableHead>
                    <TableHead className="h-10 px-4 font-medium">
                      Start Time
                    </TableHead>
                    <TableHead className="h-10 px-4 font-medium">
                      End Time
                    </TableHead>
                    <TableHead className="h-10 px-4 text-center font-medium">
                      Students
                    </TableHead>
                    <TableHead className="h-10 px-4 text-right font-medium">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedEvents.map((event) => (
                    <TableRow
                      key={event.id}
                      className={
                        event.isArchived
                          ? 'opacity-60 bg-muted/5'
                          : 'hover:bg-muted/10'
                      }
                    >
                      <TableCell className="px-4 py-3 font-medium text-foreground">
                        {event.name}
                        {event.isArchived && (
                          <Badge
                            variant="secondary"
                            className="ml-2 text-[10px]"
                          >
                            Archived
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge
                          variant="secondary"
                          className={getTypeBadgeClasses(event.type)}
                        >
                          {getTypeLabel(event.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground">
                        {event.startTimeStr ?? event.startTime}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground">
                        {event.endTimeStr ?? event.endTime}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center font-medium text-foreground">
                        {event.numOfStudent}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        {hasAnyEventAction && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canEventWrite && (
                              <DropdownMenuItem
                                onClick={() => openEditEvent(event.id)}
                              >
                                <Edit2 className="mr-2 h-3.5 w-3.5" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {canEventWrite && (
                              <DropdownMenuItem
                                onClick={() => handleDuplicate(event)}
                              >
                                <Copy className="mr-2 h-3.5 w-3.5" />
                                Duplicate
                              </DropdownMenuItem>
                            )}
                            {canEventArchive && (
                              <DropdownMenuItem
                                onClick={() =>
                                  archiveMutation.mutate(event.id)
                                }
                              >
                                <Archive className="mr-2 h-3.5 w-3.5" />
                                {event.isArchived ? 'Unarchive' : 'Archive'}
                              </DropdownMenuItem>
                            )}
                            {(canEventWrite || canEventArchive) &&
                              ((canEventApprove && !event.isArchived) || canEventDelete) && (
                                <DropdownMenuSeparator />
                              )}
                            {!event.isArchived && canEventApprove && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setConfirmAction({
                                    type: 'approve',
                                    lesson: event,
                                  })
                                }
                              >
                                <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                                Approve
                              </DropdownMenuItem>
                            )}
                            {canEventDelete && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() =>
                                setConfirmAction({
                                  type: 'delete',
                                  lesson: event,
                                })
                              }
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation AlertDialog */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'delete'
                ? 'Delete Event'
                : 'Approve Event'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'delete'
                ? 'Are you sure you want to delete this event? This action cannot be undone.'
                : 'Approving will create worklogs for all assigned teachers and archive this event. Continue?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={
                confirmAction?.type === 'delete'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
            >
              {confirmAction?.type === 'delete' ? 'Delete' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
