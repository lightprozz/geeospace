'use client'
// ---------------------------------------------------------------------------
// _components/level-upsert-dialog.tsx
// Create / Edit Study Level dialog
// Controlled by useCurriculumStore.levelDialog
// ---------------------------------------------------------------------------

import { useEffect } from 'react'
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
  useCreateStudyLevel,
  useUpdateStudyLevel,
} from '@/features/lms/hooks/curriculum/use-study-levels'
import { UpsertLevelSchema, type UpsertLevelInput } from '@/features/lms/types/curriculum'

export function LevelUpsertDialog() {
  const { levelDialog, closeLevel } = useCurriculumStore(
    useShallow((s) => ({ levelDialog: s.levelDialog, closeLevel: s.closeLevel })),
  )

  const isEdit = levelDialog.mode === 'edit'
  const { mutate: create, isPending: isCreating } = useCreateStudyLevel()
  const { mutate: update, isPending: isUpdating } = useUpdateStudyLevel()
  const isPending = isCreating || isUpdating

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpsertLevelInput>({
    // zodResolver requires type cast for complex schemas
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(UpsertLevelSchema) as any,
    defaultValues: {
      name: '',
      description: '',
      numberOfLesson: 1,
      lessonTime: 45,
    },
  })

  // Pre-fill form when entering edit mode (or reset on create)
  useEffect(() => {
    if (levelDialog.data) {
      reset({
        name: levelDialog.data.name,
        description: levelDialog.data.description ?? '',
        numberOfLesson: levelDialog.data.numberOfLesson ?? 1,
        lessonTime: levelDialog.data.lessonTime ?? 45,
      })
    } else {
      reset({ name: '', description: '', numberOfLesson: 1, lessonTime: 45 })
    }
  }, [levelDialog.data, reset])

  function onSubmit(values: UpsertLevelInput) {
    if (isEdit && levelDialog.data) {
      update(
        { id: levelDialog.data.id, data: values },
        { onSuccess: closeLevel },
      )
    } else {
      create(values, { onSuccess: closeLevel })
    }
  }

  return (
    <Dialog open={levelDialog.open} onOpenChange={(open) => !open && closeLevel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Study Level' : 'Create Study Level'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the study level details below.'
              : 'Fill in the details to create a new study level.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="level-name">
              Level Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="level-name"
              placeholder="e.g. Kindergarten 1"
              {...register('name')}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="level-desc">Description</Label>
            <Textarea
              id="level-desc"
              placeholder="Optional description..."
              rows={2}
              className="resize-none"
              {...register('description')}
            />
          </div>

          {/* Number of Lessons + Lesson Time — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="level-lessons">
                No. of Lessons <span className="text-destructive">*</span>
              </Label>
              <Input
                id="level-lessons"
                type="number"
                min={1}
                placeholder="32"
                {...register('numberOfLesson')}
                aria-invalid={!!errors.numberOfLesson}
              />
              {errors.numberOfLesson && (
                <p className="text-xs text-destructive">{errors.numberOfLesson.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="level-time">
                Lesson Time (min) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="level-time"
                type="number"
                min={1}
                placeholder="45"
                {...register('lessonTime')}
                aria-invalid={!!errors.lessonTime}
              />
              {errors.lessonTime && (
                <p className="text-xs text-destructive">{errors.lessonTime.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeLevel}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Level'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
