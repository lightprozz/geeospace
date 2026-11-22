'use client'
// ---------------------------------------------------------------------------
// _components/schedule-upsert-dialog.tsx
// Create/Edit schedule form — Shadcn Dialog + react-hook-form + Zod
// Matches legacy EditSchedule.js form fields
// ---------------------------------------------------------------------------

import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Calendar, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useScheduleDialog } from '@/features/lms/stores/use-schedule-store'
import { useScheduleDetail, useCreateSchedule, useUpdateSchedule } from '@/features/lms/hooks/schedule/use-schedules'
import {
  ScheduleFormSchema,
  DEFAULT_SCHEDULE_FORM,
  SCHEDULE_DAYS,
} from '@/features/lms/types/schedule'
import type { ScheduleFormValues, DayKey } from '@/features/lms/types/schedule'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScheduleUpsertDialog() {
  const {
    scheduleDialog: { open, mode, editingId },
    closeScheduleDialog,
  } = useScheduleDialog()

  const isEdit = mode === 'edit'
  const { data: existingSchedule, isLoading: isLoadingDetail } =
    useScheduleDetail(isEdit ? editingId : undefined)

  const createMutation = useCreateSchedule()
  const updateMutation = useUpdateSchedule()
  const isPending = createMutation.isPending || updateMutation.isPending

  // ── Form setup ──────────────────────────────────────────────────
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(ScheduleFormSchema),
    defaultValues: DEFAULT_SCHEDULE_FORM,
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = form
  const values = useWatch({ control: form.control })

  // Pre-fill when editing
  useEffect(() => {
    if (isEdit && existingSchedule) {
      reset({
        name: existingSchedule.name,
        monday: existingSchedule.monday,
        tuesday: existingSchedule.tuesday,
        wednesday: existingSchedule.wednesday,
        thursday: existingSchedule.thursday,
        friday: existingSchedule.friday,
        saturday: existingSchedule.saturday,
        sunday: existingSchedule.sunday,
        startTime: existingSchedule.startTime
          ? existingSchedule.startTime.substring(11, 16)
          : '',
        endTime: existingSchedule.endTime
          ? existingSchedule.endTime.substring(11, 16)
          : '',
        startDate: existingSchedule.startDate
          ? existingSchedule.startDate.substring(0, 10)
          : '',
        endDate: existingSchedule.endDate
          ? existingSchedule.endDate.substring(0, 10)
          : '',
        classCourseId: existingSchedule.classCourseId,
        classRoomId: existingSchedule.classRoomId,
      })
    } else if (!isEdit && open) {
      reset(DEFAULT_SCHEDULE_FORM)
    }
  }, [isEdit, existingSchedule, open, reset])

  // ── Submit handler ──────────────────────────────────────────────
  function onSubmit(values: ScheduleFormValues) {
    if (isEdit && editingId) {
      updateMutation.mutate(
        { id: editingId, data: values },
        { onSuccess: () => closeScheduleDialog() },
      )
    } else {
      createMutation.mutate(values, {
        onSuccess: () => closeScheduleDialog(),
      })
    }
  }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeScheduleDialog()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {isEdit ? 'Edit Schedule' : 'Set Schedule'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update schedule details and day selections.'
              : 'Create a new schedule with shift times and days.'}
          </DialogDescription>
        </DialogHeader>

        {isEdit && isLoadingDetail ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="schedule-name">Name</Label>
              <Input
                id="schedule-name"
                placeholder="Schedule name"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="schedule-start-date">Start Date</Label>
                <Input
                  id="schedule-start-date"
                  type="date"
                  {...register('startDate')}
                />
                {errors.startDate && (
                  <p className="text-xs text-destructive">
                    {errors.startDate.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="schedule-end-date">End Date</Label>
                <Input
                  id="schedule-end-date"
                  type="date"
                  {...register('endDate')}
                />
                {errors.endDate && (
                  <p className="text-xs text-destructive">
                    {errors.endDate.message}
                  </p>
                )}
              </div>
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="schedule-start-time">Start Time</Label>
                <Input
                  id="schedule-start-time"
                  type="time"
                  {...register('startTime')}
                />
                {errors.startTime && (
                  <p className="text-xs text-destructive">
                    {errors.startTime.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="schedule-end-time">End Time</Label>
                <Input
                  id="schedule-end-time"
                  type="time"
                  {...register('endTime')}
                />
                {errors.endTime && (
                  <p className="text-xs text-destructive">
                    {errors.endTime.message}
                  </p>
                )}
              </div>
            </div>

            {/* Day checkboxes */}
            <div className="space-y-2">
              <Label>Days of Week</Label>
              <div className="grid grid-cols-4 gap-2">
                {SCHEDULE_DAYS.map(({ key, full }) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={values[key as DayKey]}
                      onCheckedChange={(checked) =>
                        setValue(key as DayKey, !!checked, {
                          shouldValidate: true,
                        })
                      }
                    />
                    {full}
                  </label>
                ))}
              </div>
              {errors.monday && (
                <p className="text-xs text-destructive">
                  {errors.monday.message}
                </p>
              )}
            </div>

            {/* Footer */}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeScheduleDialog}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                {isEdit ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
