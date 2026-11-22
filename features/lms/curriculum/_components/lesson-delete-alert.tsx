'use client'
// ---------------------------------------------------------------------------
// _components/lesson-delete-alert.tsx
// Soft-delete confirmation for single or bulk lesson plans
// ---------------------------------------------------------------------------

import { Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  useDeleteLessonPlan,
  useBulkDeleteLessonPlans,
} from '@/features/lms/hooks/curriculum/use-lesson-plans'
import type { LessonListItem } from '@/features/lms/types/curriculum'

// ----- Single delete -------------------------------------------------------

interface LessonDeleteAlertProps {
  open: boolean
  lesson: LessonListItem | null
  levelId: string
  onClose: () => void
}

export function LessonDeleteAlert({
  open,
  lesson,
  levelId,
  onClose,
}: LessonDeleteAlertProps) {
  const { mutate: deleteSingle, isPending } = useDeleteLessonPlan(levelId)

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive lesson plan?</AlertDialogTitle>
          <AlertDialogDescription>
            Lesson <strong className="text-foreground">{lesson?.lesson}</strong>{' '}
            — {lesson?.subject} will be archived (soft delete). It can still be
            referenced when copying content to other lessons.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() => {
              if (lesson) deleteSingle(lesson.id, { onSuccess: onClose })
            }}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Archive
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ----- Bulk delete ---------------------------------------------------------

interface BulkLessonDeleteAlertProps {
  open: boolean
  count: number
  ids: string[]
  levelId: string
  onClose: () => void
}

export function BulkLessonDeleteAlert({
  open,
  count,
  ids,
  levelId,
  onClose,
}: BulkLessonDeleteAlertProps) {
  const { mutate: bulkDelete, isPending } = useBulkDeleteLessonPlans(levelId)

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive {count} lesson plans?</AlertDialogTitle>
          <AlertDialogDescription>
            The selected {count} lesson plan{count > 1 ? 's' : ''} will be
            archived. They can still be referenced when copying content.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() => bulkDelete(ids, { onSuccess: onClose })}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Archive {count} lessons
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
