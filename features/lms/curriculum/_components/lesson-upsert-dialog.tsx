'use client'
// ---------------------------------------------------------------------------
// _components/lesson-upsert-dialog.tsx
// Create / Edit Lesson Plan dialog
// Business rule: validate lesson number against NumberOfLesson limit on blur
// ---------------------------------------------------------------------------

import { useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCurriculumStore } from '@/features/lms/stores/use-curriculum-store'
import {
  useCreateLessonPlan,
  useUpdateLessonPlan,
} from '@/features/lms/hooks/curriculum/use-lesson-plans'
import { checkLessonExists } from '@/features/lms/lib/curriculum/api'
import { UpsertLessonSchema, type UpsertLessonInput } from '@/features/lms/types/curriculum'

interface LessonUpsertDialogProps {
  levelId: string
}

export function LessonUpsertDialog({ levelId }: LessonUpsertDialogProps) {
  const { lessonDialog, closeLesson } = useCurriculumStore(
    useShallow((s) => ({ lessonDialog: s.lessonDialog, closeLesson: s.closeLesson })),
  )

  const isEdit = lessonDialog.mode === 'edit'
  const { mutate: create, isPending: isCreating } = useCreateLessonPlan(levelId)
  const { mutate: update, isPending: isUpdating } = useUpdateLessonPlan(levelId)
  const isPending = isCreating || isUpdating

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<UpsertLessonInput>({
    // zodResolver requires type cast for complex schemas
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(UpsertLessonSchema) as any,
    defaultValues: {
      levelId,
      lesson: '',
      subject: '',
      content: '',
      tb: '',
    },
  })

  // Pre-fill form in edit mode
  useEffect(() => {
    if (lessonDialog.data) {
      reset({
        levelId,
        lesson: lessonDialog.data.lesson,
        subject: lessonDialog.data.subject ?? '',
        content: lessonDialog.data.content ?? '',
        tb: lessonDialog.data.tb ?? '',
      })
    } else {
      reset({ levelId, lesson: '', subject: '', content: '', tb: '' })
    }
  }, [lessonDialog.data, levelId, reset])

  // Async lesson number validation on blur
  const validateLessonOnBlur = useCallback(async () => {
    const lesson = getValues('lesson')
    if (!lesson || !levelId) return

    const editId = isEdit && lessonDialog.data ? lessonDialog.data.id : ''

    try {
      const exists = await checkLessonExists(levelId, lesson, editId)
      if (exists.exists || exists.exceedsMaxLessons) {
        setError('lesson', {
          message: 'Lesson number already exists or exceeds the level limit',
        })
      } else {
        clearErrors('lesson')
      }
    } catch {
      // Silent fail — don't block submit if validation API is unavailable
    }
  }, [getValues, levelId, isEdit, lessonDialog.data, setError, clearErrors])

  function onSubmit(values: UpsertLessonInput) {
    if (isEdit && lessonDialog.data) {
      update(
        { id: lessonDialog.data.id, data: values },
        { onSuccess: closeLesson },
      )
    } else {
      create(values, { onSuccess: closeLesson })
    }
  }

  return (
    <Dialog open={lessonDialog.open} onOpenChange={(open) => !open && closeLesson()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Lesson Plan' : 'Add Lesson Plan'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the lesson plan details. Lesson number is validated against the level limit.'
              : 'Create a new lesson plan. Lesson number must not exceed the study level limit.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Lesson Number */}
          <div className="space-y-1.5">
            <Label htmlFor="lesson-number">
              Lesson Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lesson-number"
              placeholder="e.g. 5"
              {...register('lesson')}
              onBlur={validateLessonOnBlur}
              aria-invalid={!!errors.lesson}
            />
            {errors.lesson && (
              <p className="text-xs text-destructive">{errors.lesson.message}</p>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label htmlFor="lesson-subject">
              Subject <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lesson-subject"
              placeholder="e.g. Transportation"
              {...register('subject')}
              aria-invalid={!!errors.subject}
            />
            {errors.subject && (
              <p className="text-xs text-destructive">{errors.subject.message}</p>
            )}
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label htmlFor="lesson-content">Content / Notes</Label>
            <Textarea
              id="lesson-content"
              placeholder="Optional lesson notes..."
              rows={3}
              className="resize-none"
              {...register('content')}
            />
          </div>

          {/* Textbook reference */}
          <div className="space-y-1.5">
            <Label htmlFor="lesson-tb">Textbook (TB)</Label>
            <Input
              id="lesson-tb"
              placeholder="e.g. p.24"
              {...register('tb')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeLesson}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Lesson'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
