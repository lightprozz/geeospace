'use client'
// ---------------------------------------------------------------------------
// _components/room-upsert-dialog.tsx
// Dialog for creating or editing a Room in a specific branch
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useRoomDialog } from '@/features/lms/stores/use-branch-store'
import {
  useClassroomById,
  useCreateClassroom,
  useUpdateClassroom,
} from '@/features/lms/hooks/branches/use-classrooms'
import { useRoomTypes } from '@/features/lms/hooks/branches/use-room-types'
import { ClassRoomFormSchema } from '@/features/lms/types/branch'
import type { ClassRoomFormInput } from '@/features/lms/types/branch'
import { ManagementError } from '../management-error'

export function RoomUpsertDialog() {
  const { roomDialog, closeRoom } = useRoomDialog()
  const { open, mode, editId, campusId } = roomDialog
  const isEdit = mode === 'edit'

  // Lookups & Data
  const { data: roomData, isLoading: isLoadingRoom, error, refetch } = useClassroomById(
    isEdit ? editId : undefined,
  )
  const { data: roomTypes = [], isLoading: isLoadingTypes, error: typesError, refetch: refetchTypes } = useRoomTypes(open)

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ClassRoomFormInput>({
    resolver: zodResolver(ClassRoomFormSchema),
    defaultValues: {
      name: '',
      roomNumber: '',
      campusId: campusId ?? '',
      roomTypeId: '', // Empty string maps to null in API
    },
  })

  const formRoomTypeId = useWatch({ control, name: 'roomTypeId' })

  // Keep campusId in sync with dialog state
  useEffect(() => {
    if (campusId) {
      setValue('campusId', campusId)
    }
  }, [campusId, setValue])

  // Reset form when dialog opens/closes or data loads
  useEffect(() => {
    if (!open) {
      reset({ name: '', roomNumber: '', campusId: campusId ?? '', roomTypeId: '' })
    } else if (isEdit && roomData) {
      reset({
        name: roomData.name ?? '',
        roomNumber: roomData.roomNumber ?? '',
        campusId: roomData.campusId ?? campusId ?? '',
        roomTypeId: roomData.roomTypeId ?? '',
      })
    } else if (!isEdit) {
      reset({ name: '', roomNumber: '', campusId: campusId ?? '', roomTypeId: '' })
    }
  }, [open, isEdit, roomData, campusId, reset])

  // Mutations
  const createMutation = useCreateClassroom()
  const updateMutation = useUpdateClassroom()

  const onSubmit = async (data: ClassRoomFormInput) => {
    if (isEdit && editId) {
      updateMutation.mutate(
        { id: editId, data },
        { onSuccess: () => closeRoom() },
      )
    } else {
      createMutation.mutate(data, {
        onSuccess: () => closeRoom(),
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(val) => !val && closeRoom()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Room' : 'Add New Room'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the room details below.'
              : 'Provide details to add a new room to this location.'}
          </DialogDescription>
        </DialogHeader>

        {error || typesError ? (
          <ManagementError
            resource={error ? 'room details' : 'room types'}
            error={error ?? typesError}
            onRetry={() => void (error ? refetch() : refetchTypes())}
          />
        ) : isEdit && isLoadingRoom ? (
          <div className="flex py-10 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="room-name">
                Room Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="room-name"
                placeholder="e.g. Columbia"
                {...register('name')}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="room-number">Room Number / Location</Label>
              <Input
                id="room-number"
                placeholder="e.g. 101"
                {...register('roomNumber')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="room-type">Room Type</Label>
              <Select
                value={formRoomTypeId || 'none'}
                onValueChange={(val) =>
                  setValue('roomTypeId', val === 'none' ? '' : val, { shouldValidate: true })
                }
              >
                <SelectTrigger id="room-type" disabled={isLoadingTypes} aria-invalid={!!errors.roomTypeId}>
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground italic">None (Unassigned)</span>
                  </SelectItem>
                  {roomTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                  {!isLoadingTypes && roomTypes.length === 0 && (
                    <SelectItem value="no-types" disabled>
                      No types available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.roomTypeId && (
                <p className="text-xs text-destructive">{errors.roomTypeId.message}</p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={closeRoom} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isPending || isLoadingTypes}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? 'Save Changes' : 'Add Room'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
