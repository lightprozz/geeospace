'use client'
// ---------------------------------------------------------------------------
// app/(dashboard)/attendance/_components/event-upsert-dialog.tsx
// SingleLesson create/edit dialog — 2-column form with branch cascading
// Uses shadcn Dialog, FieldGroup/Field/FieldLabel/FieldError, Select, Input, Button
// react-hook-form + zodResolver for validation
// ---------------------------------------------------------------------------

import { useEffect, useMemo } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

import { useEventDialog } from '@/features/lms/stores/use-attendance-store'
import {
  useSingleLessonDetail,
  useSingleLessonApproved,
  useCreateSingleLesson,
  useUpdateSingleLesson,
} from '@/features/lms/hooks/attendance/use-attendance'
import {
  useStudentsByBranch,
  useTeachersByBranch,
} from '@/features/lms/hooks/attendance/use-attendance-lookups'
import { useCampusList } from '@/features/lms/hooks/schedule/use-schedule-lookups'
import { useAuthStore } from '@/stores/use-auth-store'

import {
  SingleLessonFormSchema,
  DEFAULT_SINGLE_LESSON_FORM,
  SINGLE_LESSON_TYPE_OPTIONS,
} from '@/features/lms/types/attendance'
import type { SingleLessonFormValues } from '@/features/lms/types/attendance'
import type { z } from 'zod'

// Input type for the form (before Zod transforms defaults)
type FormInput = z.input<typeof SingleLessonFormSchema>

export function EventUpsertDialog() {
  const { eventDialog, closeEventDialog } = useEventDialog()
  const isOpen = eventDialog.open
  const isEditMode = eventDialog.mode === 'edit'
  const editingId = eventDialog.editingId

  // Load existing data for edit mode
  const { data: existingLesson } = useSingleLessonDetail(
    isEditMode ? editingId : undefined,
  )
  const { data: isApproved } = useSingleLessonApproved(
    isEditMode ? editingId : undefined,
  )

  // Form setup
  const form = useForm<FormInput>({
    resolver: zodResolver(SingleLessonFormSchema) as never,
    defaultValues: DEFAULT_SINGLE_LESSON_FORM,
  })

  const watchBranchId = useWatch({ control: form.control, name: 'branchId' }) ?? ''
  const selectedStudentIds = useWatch({ control: form.control, name: 'studentIds' }) ?? []
  const selectedTeacherIds = useWatch({ control: form.control, name: 'teacherIds' }) ?? []
  const roomId = useWatch({ control: form.control, name: 'roomId' })
  const type = useWatch({ control: form.control, name: 'type' })

  // Lookup queries — cascaded by branch
  const userId = useAuthStore((s) => s.user?.sub ?? '')
  const { data: campuses } = useCampusList(userId)
  const { data: branchStudents } = useStudentsByBranch(
    watchBranchId || undefined,
  )
  const { data: branchTeachers } = useTeachersByBranch(
    watchBranchId || undefined,
  )

  // Mutations
  const createMutation = useCreateSingleLesson()
  const updateMutation = useUpdateSingleLesson()
  const isPending = createMutation.isPending || updateMutation.isPending

  // Reset form when dialog opens / data loads
  useEffect(() => {
    if (!isOpen) return

    if (isEditMode && existingLesson) {
      form.reset({
        name: existingLesson.name,
        type: existingLesson.type,
        roomId: existingLesson.roomId ?? '',
        branchId: existingLesson.branchId ?? '',
        startTime: existingLesson.startTime,
        endTime: existingLesson.endTime,
        studentIds: existingLesson.studentIds,
        teacherIds: existingLesson.teacherIds,
      })
    } else if (!isEditMode) {
      form.reset(DEFAULT_SINGLE_LESSON_FORM)
    }
  }, [isOpen, isEditMode, existingLesson, form])

  const onSubmit = (data: FormInput) => {
    const payload = data as SingleLessonFormValues
    if (isEditMode && editingId) {
      updateMutation.mutate(
        { id: editingId, data: payload },
        { onSuccess: () => closeEventDialog() },
      )
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => closeEventDialog(),
      })
    }
  }

  // Multi-select toggle helpers
  const toggleStudent = (id: string) => {
    const current = form.getValues('studentIds') ?? []
    form.setValue(
      'studentIds',
      current.includes(id)
        ? current.filter((s) => s !== id)
        : [...current, id],
    )
  }

  const toggleTeacher = (id: string) => {
    const current = form.getValues('teacherIds') ?? []
    form.setValue(
      'teacherIds',
      current.includes(id)
        ? current.filter((t) => t !== id)
        : [...current, id],
    )
  }

  // Available campuses as branch options
  const branchOptions = useMemo(
    () => campuses ?? [],
    [campuses],
  )

  const disabled = isApproved === true

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeEventDialog()}>
      <DialogContent className="@container/event-dialog max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Event' : 'Create New Event'}
          </DialogTitle>
        </DialogHeader>

        {disabled && (
          <Alert>
            <AlertDescription>
              This event has been approved and cannot be edited.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 gap-6 @2xl/event-dialog:grid-cols-2">
            {/* Left Column */}
            <FieldGroup>
              <Field>
                <FieldLabel>Name of Lesson</FieldLabel>
                <Input
                  placeholder="e.g. Catchup - TH 19.5"
                  disabled={disabled}
                  {...form.register('name')}
                />
                <FieldError>
                  {form.formState.errors.name?.message}
                </FieldError>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Select Branch</FieldLabel>
                  <Select
                    value={watchBranchId}
                    onValueChange={(val) => {
                      form.setValue('branchId', val)
                      // Reset room + students + teachers on branch change
                      form.setValue('roomId', '')
                      form.setValue('studentIds', [])
                      form.setValue('teacherIds', [])
                    }}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branchOptions.map((campus) => (
                        <SelectItem key={campus.id} value={campus.id}>
                          {campus.address ?? campus.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel>Select Room</FieldLabel>
                  <Select
                    value={roomId}
                    onValueChange={(val) => form.setValue('roomId', val)}
                    disabled={disabled || !watchBranchId}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          watchBranchId ? 'Select Room' : 'Select branch first'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Room options would come from campus-based room API */}
                      <SelectItem value="placeholder" disabled>
                        Select branch to load rooms
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field>
                <FieldLabel>
                  Students ({selectedStudentIds.length} selected)
                </FieldLabel>
                <div className="max-h-32 overflow-auto rounded-md border border-input p-2">
                  {!watchBranchId ? (
                    <p className="py-2 text-center text-xs text-muted-foreground">
                      Select a branch first
                    </p>
                  ) : !branchStudents?.length ? (
                    <p className="py-2 text-center text-xs text-muted-foreground">
                      No students found
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {branchStudents.map((student) => (
                        <label
                          key={student.id}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(student.id)}
                            onChange={() => toggleStudent(student.id)}
                            disabled={disabled}
                            className="rounded border-input accent-primary"
                          />
                          <span>
                            {student.englishName
                              ? `${student.englishName} - ${student.name}`
                              : student.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
            </FieldGroup>

            {/* Right Column */}
            <FieldGroup>
              <Field>
                <FieldLabel>Type of Lesson</FieldLabel>
                <Select
                  value={String(type)}
                  onValueChange={(val) =>
                    form.setValue('type', Number(val))
                  }
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SINGLE_LESSON_TYPE_OPTIONS.map((opt) => (
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

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Start Time</FieldLabel>
                  <Input
                    type="datetime-local"
                    disabled={disabled}
                    {...form.register('startTime')}
                  />
                  <FieldError>
                    {form.formState.errors.startTime?.message}
                  </FieldError>
                </Field>
                <Field>
                  <FieldLabel>End Time</FieldLabel>
                  <Input
                    type="datetime-local"
                    disabled={disabled}
                    {...form.register('endTime')}
                  />
                  <FieldError>
                    {form.formState.errors.endTime?.message}
                  </FieldError>
                </Field>
              </div>

              <Field>
                <FieldLabel>
                  Teachers ({selectedTeacherIds.length} selected)
                </FieldLabel>
                <div className="max-h-32 overflow-auto rounded-md border border-input p-2">
                  {!watchBranchId ? (
                    <p className="py-2 text-center text-xs text-muted-foreground">
                      Select a branch first
                    </p>
                  ) : !branchTeachers?.length ? (
                    <p className="py-2 text-center text-xs text-muted-foreground">
                      No teachers found
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {branchTeachers.map((teacher) => (
                        <label
                          key={teacher.id}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTeacherIds.includes(teacher.id)}
                            onChange={() => toggleTeacher(teacher.id)}
                            disabled={disabled}
                            className="rounded border-input accent-primary"
                          />
                          <span>{teacher.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
            </FieldGroup>
          </div>

          <Separator className="my-6" />

          {/* Selected badges preview */}
          {(selectedStudentIds.length > 0 || selectedTeacherIds.length > 0) && (
            <div className="mb-4 flex flex-wrap gap-1">
              {selectedStudentIds.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {selectedStudentIds.length} student(s)
                </Badge>
              )}
              {selectedTeacherIds.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {selectedTeacherIds.length} teacher(s)
                </Badge>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeEventDialog}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={disabled || isPending}>
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
