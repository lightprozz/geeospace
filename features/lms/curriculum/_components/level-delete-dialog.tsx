'use client'
// ---------------------------------------------------------------------------
// _components/level-delete-dialog.tsx
// Hard delete confirmation AlertDialog for StudyLevel
// WARNING: StudyLevel uses HARD delete (not soft) — shown to user
// ---------------------------------------------------------------------------

import { Loader2, TriangleAlert } from 'lucide-react'
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
import { useDeleteStudyLevel } from '@/features/lms/hooks/curriculum/use-study-levels'
import type { LevelListItem } from '@/features/lms/types/curriculum'

interface LevelDeleteDialogProps {
  open: boolean
  level: LevelListItem | null
  onClose: () => void
}

export function LevelDeleteDialog({ open, level, onClose }: LevelDeleteDialogProps) {
  const { mutate: deleteLevel, isPending } = useDeleteStudyLevel()

  function handleConfirm() {
    if (!level) return
    deleteLevel(level.id, { onSuccess: onClose })
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <TriangleAlert className="h-5 w-5 text-destructive" />
            Delete Study Level?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span>
              You are about to permanently delete{' '}
              <strong className="text-foreground">{level?.name}</strong>.
            </span>
            <br />
            <span className="text-destructive font-medium">
              This is a permanent action and cannot be undone.
            </span>{' '}
            All associated lesson plans and unit plans will be affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Level
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
