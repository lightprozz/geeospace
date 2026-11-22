'use client'
// ---------------------------------------------------------------------------
// app/(dashboard)/attendance/_components/catch-up-upsert-dialog.tsx
// CatchUp create/edit dialog with type-conditional form sections (4 types)
// Uses shadcn Dialog, Field components, Select, Input, Button
// react-hook-form + zodResolver for conditional Zod validation
// ---------------------------------------------------------------------------

import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldError,
} from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

import { useCatchUpDialog } from '@/features/lms/stores/use-attendance-store'
import {
  useCatchUpDetail,
  useCreateCatchUp,
  useUpdateCatchUp,
  useAbsentStudents,
} from '@/features/lms/hooks/attendance/use-attendance'
import {
  useClassLessonsByTeacher,
  useClassCourseSchedules,
} from '@/features/lms/hooks/attendance/use-attendance-lookups'

import {
  CatchUpFormSchema,
  CatchUpType,
  DEFAULT_CATCHUP_FORM,
  CATCH_UP_TYPE_OPTIONS,
} from '@/features/lms/types/attendance'
import type { CatchUpFormValues } from '@/features/lms/types/attendance'
import type { z } from 'zod'
import { shortenName } from '@/features/lms/lib/attendance/display-name'

// Input type for form (before Zod transforms defaults)
type FormInput = z.input<typeof CatchUpFormSchema>

interface CatchUpUpsertDialogProps {
  teacherId: string | undefined
}

export function CatchUpUpsertDialog({ teacherId }: CatchUpUpsertDialogProps) {
  const { catchUpDialog, closeCatchUpDialog } = useCatchUpDialog()
  const isOpen = catchUpDialog.open
  const isEditMode = catchUpDialog.mode === 'edit'
  const editingId = catchUpDialog.editingId

  // Load existing data for edit mode
  const { data: existingCatchUp } = useCatchUpDetail(
    isEditMode ? editingId : undefined,
  )

  // Lookup data
  const { data: absentStudents } = useAbsentStudents(teacherId)
  const { data: classLessons } = useClassLessonsByTeacher(teacherId)
  const { data: classCourses } = useClassCourseSchedules()

  // Mutations
  const createMutation = useCreateCatchUp()
  const updateMutation = useUpdateCatchUp()
  const isPending = createMutation.isPending || updateMutation.isPending

  // Form setup
  const form = useForm<FormInput>({
    resolver: zodResolver(CatchUpFormSchema) as never,
    defaultValues: {
      ...DEFAULT_CATCHUP_FORM,
      teacherId: teacherId ?? '',
    },
  })

  const values = useWatch({ control: form.control })
  const watchType = values.catchUpType

  // Reset form when dialog opens / data loads
  useEffect(() => {
    if (!isOpen) return

    if (isEditMode && existingCatchUp) {
      form.reset({
        name: existingCatchUp.name,
        catchUpType: existingCatchUp.catchUpType,
        teacherId: existingCatchUp.teacherId,
        studentId: existingCatchUp.studentId,
        catchUpStatus: existingCatchUp.catchUpStatus,
        classLessonId: existingCatchUp.classLessonId ?? '',
        catchUpTime: existingCatchUp.catchUpTime,
        startDate: existingCatchUp.startDate?.split('T')[0] ?? '',
        startTime: existingCatchUp.startTime
          ? new Date(existingCatchUp.startTime)
              .toTimeString()
              .slice(0, 5)
          : '',
        newClassId: existingCatchUp.newClassId ?? '',
        isChangeClass: !!existingCatchUp.newClassId,
        linkOnline: existingCatchUp.linkOnline ?? '',
      })
    } else if (!isEditMode) {
      form.reset({
        ...DEFAULT_CATCHUP_FORM,
        teacherId: teacherId ?? '',
      })
    }
  }, [isOpen, isEditMode, existingCatchUp, teacherId, form])

  const onSubmit = (data: FormInput) => {
    const payload = data as CatchUpFormValues
    // Set isChangeClass for type 3
    if (payload.catchUpType === CatchUpType.AnotherClass) {
      payload.isChangeClass = true
    }

    if (isEditMode && editingId) {
      updateMutation.mutate(
        { id: editingId, data: payload },
        { onSuccess: () => closeCatchUpDialog() },
      )
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => closeCatchUpDialog(),
      })
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && closeCatchUpDialog()}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Catch-up Schedule' : 'New Catch-up Schedule'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input
                placeholder="e.g. Bù buổi 5 - Nguyễn Văn An"
                {...form.register('name')}
              />
              <FieldError>
                {form.formState.errors.name?.message}
              </FieldError>
            </Field>

            <Field>
              <FieldLabel>Student</FieldLabel>
              <Select
                value={values.studentId}
                onValueChange={(val) => form.setValue('studentId', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {absentStudents?.map((student, idx) => (
                    <SelectItem
                      key={`${student.studentName}-${idx}`}
                      value={student.studentName}
                    >
                      {student.englishName
                        ? `${student.englishName} - ${shortenName(student.studentName)}`
                        : shortenName(student.studentName)}
                      {' '}
                      ({student.class})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>
                {form.formState.errors.studentId?.message}
              </FieldError>
            </Field>

            <Field>
              <FieldLabel>Catch-up Type</FieldLabel>
              <Select
                value={String(watchType)}
                onValueChange={(val) =>
                  form.setValue('catchUpType', Number(val))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {CATCH_UP_TYPE_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={String(opt.value)}
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Separator />

            {/* Type 1: Before Class — select class lesson + catch-up time */}
            {watchType === CatchUpType.BeforeClass && (
              <>
                <Field>
                  <FieldLabel>Select Class Lesson</FieldLabel>
                  <Select
                    value={values.classLessonId ?? ''}
                    onValueChange={(val) =>
                      form.setValue('classLessonId', val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select lesson" />
                    </SelectTrigger>
                    <SelectContent>
                      {classLessons?.map((lesson, idx) => (
                        <SelectItem
                          key={lesson.id ?? `${lesson.class}-${lesson.lesson}-${idx}`}
                          value={lesson.id ?? `lesson-${idx}`}
                        >
                          {lesson.class} — {lesson.lesson} (
                          {lesson.beginDateFormat})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError>
                    {form.formState.errors.classLessonId?.message}
                  </FieldError>
                </Field>

                <Field>
                  <FieldLabel>Catch-up Time (minutes)</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    {...form.register('catchUpTime', {
                      valueAsNumber: true,
                    })}
                  />
                </Field>
              </>
            )}

            {/* Type 2: Specific Time — date + time pickers */}
            {watchType === CatchUpType.TimeInWeek && (
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Start Date</FieldLabel>
                  <Input type="date" {...form.register('startDate')} />
                  <FieldError>
                    {form.formState.errors.startDate?.message}
                  </FieldError>
                </Field>
                <Field>
                  <FieldLabel>Start Time</FieldLabel>
                  <Input type="time" {...form.register('startTime')} />
                </Field>
              </div>
            )}

            {/* Type 3: Another Class — select target class */}
            {watchType === CatchUpType.AnotherClass && (
              <Field>
                <FieldLabel>Select Target Class</FieldLabel>
                <Select
                  value={values.newClassId ?? ''}
                  onValueChange={(val) =>
                    form.setValue('newClassId', val)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Search and select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classCourses?.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.class} ({course.level}) —{' '}
                        {course.schedule ?? 'No schedule'} —{' '}
                        {course.teacher ?? 'No teacher'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError>
                  {form.formState.errors.newClassId?.message}
                </FieldError>
              </Field>
            )}

            {/* Type 4: Online — link input */}
            {watchType === CatchUpType.Online && (
              <Field>
                <FieldLabel>Online Link</FieldLabel>
                <Input
                  type="url"
                  placeholder="https://zoom.us/j/..."
                  {...form.register('linkOnline')}
                />
                <FieldError>
                  {form.formState.errors.linkOnline?.message}
                </FieldError>
              </Field>
            )}
          </FieldGroup>

          <Separator className="my-6" />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeCatchUpDialog}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEditMode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
