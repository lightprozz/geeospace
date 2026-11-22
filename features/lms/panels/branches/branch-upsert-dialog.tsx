'use client'
// ---------------------------------------------------------------------------
// _components/branch-upsert-dialog.tsx
// Dialog for creating or editing a Branch (Campus)
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

import { useBranchDialog } from '@/features/lms/stores/use-branch-store'
import {
  useBranchById,
  useCreateBranch,
  useUpdateBranch,
} from '@/features/lms/hooks/branches/use-branches'
import { CampusFormSchema } from '@/features/lms/types/branch'
import type { CampusFormInput } from '@/features/lms/types/branch'
import { ManagementError } from '../management-error'

export function BranchUpsertDialog() {
  const { branchDialog, closeBranch } = useBranchDialog()
  const { open, mode, editId } = branchDialog
  const isEdit = mode === 'edit'

  // Query if in edit mode
  const { data: branchData, isLoading: isLoadingBranch, error, refetch } = useBranchById(
    isEdit ? editId : undefined,
  )

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CampusFormInput>({
    resolver: zodResolver(CampusFormSchema),
    defaultValues: {
      name: '',
      address: '',
      fullAddress: '',
      website: '',
      location: '',
      ipAddress: '',
    },
  })

  // Reset form when dialog opens/closes or data loads
  useEffect(() => {
    if (!open) {
      reset({ name: '', address: '', fullAddress: '', website: '', location: '', ipAddress: '' })
    } else if (isEdit && branchData) {
      reset({
        id: branchData.id,
        name: branchData.name ?? '',
        address: branchData.address ?? '',
        fullAddress: branchData.fullAddress ?? '',
        website: branchData.website ?? '',
        location: branchData.location ?? '',
        ipAddress: branchData.ipAddress ?? '',
      })
    } else if (!isEdit) {
      reset({ name: '', address: '', fullAddress: '', website: '', location: '', ipAddress: '' })
    }
  }, [open, isEdit, branchData, reset])

  // Mutations
  const createMutation = useCreateBranch()
  const updateMutation = useUpdateBranch()

  const onSubmit = async (data: CampusFormInput) => {
    if (isEdit && editId) {
      updateMutation.mutate(
        { id: editId, data },
        { onSuccess: () => closeBranch() },
      )
    } else {
      createMutation.mutate(data, {
        onSuccess: () => closeBranch(),
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(val) => !val && closeBranch()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Branch' : 'Create New Branch'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the branch details below.'
              : 'Fill in the details to create a new branch or location.'}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <ManagementError resource="branch details" error={error} onRetry={() => void refetch()} />
        ) : isEdit && isLoadingBranch ? (
          <div className="flex py-10 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 py-2"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="branch-name">
                  Short Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="branch-name"
                  placeholder="e.g. HHT"
                  {...register('name')}
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="branch-address">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="branch-address"
                  placeholder="e.g. Hoàng Hoa Thám"
                  {...register('address')}
                  aria-invalid={!!errors.address}
                />
                {errors.address && (
                  <p className="text-xs text-destructive">{errors.address.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branch-fullAddress">
                Physical Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="branch-fullAddress"
                className="w-full"
                placeholder="e.g. 11C Hoàng Hoa Thám..."
                {...register('fullAddress')}
                aria-invalid={!!errors.fullAddress}
              />
              {errors.fullAddress && (
                <p className="text-xs text-destructive">{errors.fullAddress.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branch-location">Location</Label>
              <Input
                id="branch-location"
                placeholder="e.g. HCMC"
                {...register('location')}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="branch-website">Domain</Label>
                <Input id="branch-website" placeholder="e.g. hht.geeo.vn" {...register('website')} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="branch-ip">IP Address</Label>
                <Input id="branch-ip" placeholder="e.g. 192.168.1.1" {...register('ipAddress')} />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={closeBranch} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? 'Save Changes' : 'Create Branch'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
