'use client'
// ---------------------------------------------------------------------------
// _components/student-edit-dialog.tsx
// Dialog for editing Student Info — follows room-upsert-dialog pattern
// ---------------------------------------------------------------------------

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { useUpdateStudent } from '@/features/lms/hooks/students/use-students'
import { StudentEditFormSchema } from '@/features/lms/types/student'
import type { StudentEditFormInput, StudentDetail } from '@/features/lms/types/student'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StudentEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: StudentDetail
}

// ---------------------------------------------------------------------------
// Helper: format ISO datetime to yyyy-MM-dd for native date input
// ---------------------------------------------------------------------------

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return ''
  // Already in yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().split('T')[0]
  } catch {
    return ''
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StudentEditDialog({
  open,
  onOpenChange,
  student,
}: StudentEditDialogProps) {
  const updateMutation = useUpdateStudent(student.id)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StudentEditFormInput>({
    // zodResolver requires type cast for complex schemas
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(StudentEditFormSchema) as any,
    defaultValues: {
      studentName: '',
      englishName: '',
      birthday: '',
      address: '',
      elAccount: '',
      traits: '',
      note: '',
      beginDate: '',
    },
  })

  // Reset form with student data when dialog opens
  useEffect(() => {
    if (open && student) {
      reset({
        studentName: student.studentName ?? '',
        englishName: student.englishName ?? '',
        birthday: toDateInputValue(student.birthday),
        address: student.address ?? '',
        elAccount: student.elAccount ?? '',
        traits: student.traits ?? '',
        note: student.note ?? '',
        beginDate: toDateInputValue(student.beginDate),
      })
    }
  }, [open, student, reset])

  const onSubmit = async (data: StudentEditFormInput) => {
    // Convert date fields to ISO for the backend
    const payload: Record<string, unknown> = {
      ...data,
      birthday: data.birthday ? new Date(data.birthday).toISOString() : null,
      beginDate: data.beginDate ? new Date(data.beginDate).toISOString() : null,
    }

    updateMutation.mutate(payload, {
      onSuccess: () => onOpenChange(false),
    })
  }

  const isPending = updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onOpenChange(false)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Student Info</DialogTitle>
          <DialogDescription>
            Update the student&apos;s personal information.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 py-2"
        >
          {/* 2-column grid for text fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-student-name">
                Student Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-student-name"
                placeholder="Họ và tên"
                {...register('studentName')}
                aria-invalid={!!errors.studentName}
              />
              {errors.studentName && (
                <p className="text-xs text-destructive">{errors.studentName.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-english-name">English Name</Label>
              <Input
                id="edit-english-name"
                placeholder="e.g. Ahri"
                {...register('englishName')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-birthday">Birthday</Label>
              <Input
                id="edit-birthday"
                type="date"
                {...register('birthday')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-begin-date">Begin Date</Label>
              <Input
                id="edit-begin-date"
                type="date"
                {...register('beginDate')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-el-account">EL Account</Label>
              <Input
                id="edit-el-account"
                placeholder="email@domain.com"
                {...register('elAccount')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                placeholder="Địa chỉ"
                {...register('address')}
              />
            </div>
          </div>

          {/* Full-width textarea fields */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-traits">Personality Traits</Label>
            <Textarea
              id="edit-traits"
              placeholder="Đặc điểm tính cách..."
              rows={3}
              {...register('traits')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-note">Note</Label>
            <Textarea
              id="edit-note"
              placeholder="Ghi chú..."
              rows={3}
              {...register('note')}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
