'use client'
// ---------------------------------------------------------------------------
// _components/class-upsert-dialog.tsx
// Create/Edit class dialog using Shadcn Dialog + react-hook-form + Zod
// Edit mode: fetches full entity via GET /api/ClassCourses/{id}
// to get levelId + campusId (not available in ClassCourseGrid list response)
// ---------------------------------------------------------------------------

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { BookOpen, Save } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { useClassDialog } from '@/features/lms/stores/use-class-store'
import { useAuthStore } from '@/stores/use-auth-store'
import {
  useCreateClass,
  useUpdateClass,
  useClassById,
} from '@/features/lms/hooks/classes/use-classes'
import { useCampusList } from '@/features/lms/hooks/classes/use-class-lookups'
import { useStudyLevels } from '@/features/lms/hooks/curriculum/use-study-levels'
import { CreateClassSchema, type CreateClassInput } from '@/features/lms/types/class'

export function ClassUpsertDialog() {
  const { classDialog, closeClass } = useClassDialog()
  const { open, mode, editId } = classDialog
  const isEdit = mode === 'edit'

  // ── Auth ───────────────────────────────────────────────────────
  const userId = useAuthStore((s) => s.user?.sub ?? '')

  // ── Fetch full entity for edit mode ────────────────────────────
  const { data: entity, isLoading: entityLoading } = useClassById(
    isEdit && open ? editId : undefined,
  )

  // ── Lookups ────────────────────────────────────────────────────
  const { data: levels, isLoading: levelsLoading } = useStudyLevels()
  const { data: campuses, isLoading: campusesLoading } = useCampusList(userId)

  // ── Form ───────────────────────────────────────────────────────
  const form = useForm<CreateClassInput>({
    resolver: zodResolver(CreateClassSchema),
    defaultValues: {
      levelId: '',
      campusId: '',
      name: '',
      description: '',
    },
  })

  // Reset form when dialog opens/closes or entity loads
  useEffect(() => {
    if (open) {
      if (isEdit && entity) {
        // Entity has real levelId + campusId from GET /api/ClassCourses/{id}
        form.reset({
          levelId: entity.levelId ?? '',
          campusId: entity.campusId ?? '',
          name: entity.name ?? '',
          description: entity.description ?? '',
        })
      } else if (!isEdit) {
        form.reset({
          levelId: '',
          campusId: '',
          name: '',
          description: '',
        })
      }
    }
  }, [open, isEdit, entity, form])

  // ── Mutations ──────────────────────────────────────────────────
  const createMutation = useCreateClass()
  const updateMutation = useUpdateClass()
  const isPending = createMutation.isPending || updateMutation.isPending

  function onSubmit(values: CreateClassInput) {
    // Clean empty campusId → remove key
    const payload = {
      ...values,
      campusId: values.campusId || undefined,
    }

    if (isEdit && editId) {
      updateMutation.mutate(
        { id: editId, data: payload },
        {
          onSuccess: () => {
            closeClass()
            form.reset()
          },
        },
      )
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          closeClass()
          form.reset()
        },
      })
    }
  }

  function handleClose() {
    if (!isPending) {
      closeClass()
      form.reset()
    }
  }

  // ── Loading state for edit mode ────────────────────────────────
  const showSkeleton = isEdit && entityLoading

  // ── Render ─────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {isEdit ? 'Edit Class' : 'Create New Class'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the class information below.'
              : 'Fill in the details to create a new class. Lessons will be auto-assigned from the selected level.'}
          </DialogDescription>
        </DialogHeader>

        {showSkeleton ? (
          /* Skeleton while fetching entity for edit */
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Class Name */}
            <div className="space-y-1.5">
              <Label htmlFor="class-name">
                Class Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="class-name"
                placeholder="e.g. D11V0225"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-[0.8rem] font-medium text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            {/* Level / Curriculum */}
            <div className="space-y-1.5">
              <Label htmlFor="class-level">
                Level / Curriculum <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={form.control}
                name="levelId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={levelsLoading}
                  >
                    <SelectTrigger id="class-level">
                      <SelectValue
                        placeholder={
                          levelsLoading ? 'Loading levels...' : 'Select a level'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {levels?.map((lv) => (
                        <SelectItem key={lv.id} value={lv.id}>
                          {lv.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.levelId && (
                <p className="text-[0.8rem] font-medium text-destructive">
                  {form.formState.errors.levelId.message}
                </p>
              )}
            </div>

            {/* Campus / Branch */}
            <div className="space-y-1.5">
              <Label htmlFor="class-campus">Branch (Campus)</Label>
              <Controller
                control={form.control}
                name="campusId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                    disabled={campusesLoading}
                  >
                    <SelectTrigger id="class-campus">
                      <SelectValue
                        placeholder={
                          campusesLoading
                            ? 'Loading campuses...'
                            : 'Select a campus (optional)'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {campuses?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name ? `${c.name} (${c.address})` : (c.address ?? c.id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="class-description">Description (Optional)</Label>
              <Textarea
                id="class-description"
                placeholder="Class notes..."
                rows={3}
                className="resize-none"
                {...form.register('description')}
              />
            </div>

            {/* Footer with actions */}
            <DialogFooter className="pt-2 border-t border-border mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    {isEdit ? 'Updating...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isEdit ? 'Update Class' : 'Save Class'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
