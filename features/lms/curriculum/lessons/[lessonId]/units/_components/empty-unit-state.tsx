'use client'
// ---------------------------------------------------------------------------
// _components/empty-unit-state.tsx
// Show when lesson has no units + allow copying from another lesson
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { BookOpen, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useRelatedLessons } from '@/features/lms/hooks/curriculum/use-lesson-content'
import { useCopyUnitsFromLesson, useUnitsByLesson } from '@/features/lms/hooks/curriculum/use-unit-plans'
import { usePermission } from '@/features/lms/port-support'
import type { RelatedLesson } from '@/features/lms/types/curriculum'

interface EmptyUnitStateProps {
  lessonId: string
  onCopied: () => void
}

export function EmptyUnitState({ lessonId, onCopied }: EmptyUnitStateProps) {
  const { can } = usePermission()
  const canCopyUnits = can('curriculum.create')

  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data: relatedLessons = [], isLoading: loadingRelated } = useRelatedLessons(lessonId)
  const { data: sourceUnits = [] } = useUnitsByLesson(selectedLessonId ?? '')
  const { mutate: copyUnits, isPending: isCopying } = useCopyUnitsFromLesson(lessonId)

  function handleConfirmCopy() {
    if (!selectedLessonId || sourceUnits.length === 0) return
    copyUnits(selectedLessonId, {
      onSuccess: () => {
        setConfirmOpen(false)
        setSelectedLessonId(null)
        onCopied()
      },
    })
  }

  const selectedLesson = relatedLessons.find((l: RelatedLesson) => l.id === selectedLessonId)

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-5 p-8 text-center">
      <div className="rounded-full bg-muted p-5">
        <BookOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-sm">No unit plans yet</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Add units using the button above, or copy all units from another lesson.
        </p>
      </div>

      {/* Copy from another lesson */}
      {!canCopyUnits ? null : loadingRelated ? (
        <Skeleton className="h-8 w-64" />
      ) : relatedLessons.length > 0 ? (
        <div className="flex items-center gap-2">
          <Select onValueChange={setSelectedLessonId} value={selectedLessonId ?? undefined}>
            <SelectTrigger className="h-8 text-xs w-52">
              <SelectValue placeholder="Copy from lesson..." />
            </SelectTrigger>
            <SelectContent>
              {relatedLessons.map((l: RelatedLesson) => (
                <SelectItem key={l.id} value={l.id} className="text-xs">
                  Lesson {l.lesson} — {l.subject ?? '(no subject)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            disabled={!selectedLessonId || sourceUnits.length === 0}
            onClick={() => setConfirmOpen(true)}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy Units
          </Button>
        </div>
      ) : null}

      {/* Confirm dialog before copy */}
      <AlertDialog open={confirmOpen} onOpenChange={(o) => !o && setConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Copy units from another lesson?</AlertDialogTitle>
            <AlertDialogDescription>
              This will copy all <strong>{sourceUnits.length}</strong> units from{' '}
              <strong>Lesson {selectedLesson?.lesson} — {selectedLesson?.subject}</strong>{' '}
              into this lesson. Existing units (if any) will not be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCopying}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCopy} disabled={isCopying}>
              {isCopying ? 'Copying...' : 'Copy Units'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
