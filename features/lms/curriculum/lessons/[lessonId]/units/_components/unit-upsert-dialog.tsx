'use client'
// ---------------------------------------------------------------------------
// _components/unit-upsert-dialog.tsx
// Create / Edit Unit Plan dialog
// ---------------------------------------------------------------------------

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'
import {
  useCreateUnitPlan,
  useUpdateUnitPlan,
} from '@/features/lms/hooks/curriculum/use-unit-plans'
import { UpsertUnitSchema, type UpsertUnitInput, type UnitListItem } from '@/features/lms/types/curriculum'

interface UnitUpsertDialogProps {
  open: boolean
  unit: UnitListItem | null // null = create mode
  lessonId: string
  onClose: () => void
}

export function UnitUpsertDialog({
  open,
  unit,
  lessonId,
  onClose,
}: UnitUpsertDialogProps) {
  const isEdit = !!unit
  const { mutate: create, isPending: isCreating } = useCreateUnitPlan(lessonId)
  const { mutate: update, isPending: isUpdating } = useUpdateUnitPlan(lessonId)
  const isPending = isCreating || isUpdating

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<UpsertUnitInput, any, UpsertUnitInput>({
    // zodResolver requires type cast for complex schemas
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(UpsertUnitSchema) as any,
    defaultValues: {
      lessonPlanId: lessonId,
      time: 5,
      procedures: '',
      description: '',
      materials: '',
      teacherActivities: '',
      learningOutcome: '',
      note: '',
    },
  })

  // Pre-fill in edit mode
  useEffect(() => {
    if (unit) {
      reset({
        lessonPlanId: lessonId,
        time: unit.time ?? 5,
        procedures: unit.procedures ?? '',
        description: unit.description ?? '',
        materials: unit.materials ?? '',
        teacherActivities: unit.teacherActivities ?? '',
        learningOutcome: unit.learningOutcome ?? '',
        note: unit.note ?? '',
      })
    } else {
      reset({ lessonPlanId: lessonId, time: 5, procedures: '', description: '', materials: '', teacherActivities: '', learningOutcome: '', note: '' })
    }
  }, [unit, lessonId, reset])

  function onSubmit(values: UpsertUnitInput) {
    if (isEdit && unit) {
      update({ id: unit.id, data: { ...unit, ...values } }, { onSuccess: onClose })
    } else {
      create(values, { onSuccess: onClose })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Unit' : 'Add Unit'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update unit plan details.' : 'Add a new unit to this lesson plan.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
          {/* Time + Procedures — primary fields */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="unit-time" className="text-xs">
                Time (min) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="unit-time"
                type="number"
                min={1}
                {...register('time')}
                aria-invalid={!!errors.time}
                className="h-8"
              />
              {errors.time && (
                <p className="text-xs text-destructive">{errors.time.message}</p>
              )}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="unit-procedures" className="text-xs">
                Procedures <span className="text-destructive">*</span>
              </Label>
              <Input
                id="unit-procedures"
                placeholder="e.g. Warm-up Activity"
                {...register('procedures')}
                aria-invalid={!!errors.procedures}
                className="h-8"
              />
              {errors.procedures && (
                <p className="text-xs text-destructive">{errors.procedures.message}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Optional fields */}
          {[
            { name: 'description' as const,       label: 'Description',         ph: 'Brief description...' },
            { name: 'materials' as const,          label: 'Materials',            ph: 'Materials needed...' },
            { name: 'teacherActivities' as const,  label: 'Teacher Activities',   ph: 'What teacher does...' },
            { name: 'learningOutcome' as const,    label: 'Learning Outcome',     ph: 'Expected outcome...' },
            { name: 'note' as const,               label: 'Note',                 ph: 'Additional notes...' },
          ].map(({ name, label, ph }) => (
            <div key={name} className="space-y-1.5">
              <Label htmlFor={`unit-${name}`} className="text-xs">{label}</Label>
              <Textarea
                id={`unit-${name}`}
                placeholder={ph}
                rows={2}
                className="resize-none text-sm"
                {...register(name)}
              />
            </div>
          ))}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Unit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
