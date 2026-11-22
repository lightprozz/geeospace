'use client'

// ---------------------------------------------------------------------------
// _components/collection-form-dialog.tsx — Create/Edit collection dialog
// ---------------------------------------------------------------------------

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import type { Collection } from '@/features/lms/types/form-template'
import { useCreateCollection, useUpdateCollection } from '../hooks/use-collection-mutations'

const formSchema = z.object({
  name: z.string().min(1, 'Tên là bắt buộc').max(200),
  description: z.string().max(2000).optional(),
  active: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  collection?: Collection | null
}

export function CollectionFormDialog({ open, onOpenChange, collection }: Props) {
  const create = useCreateCollection()
  const update = useUpdateCollection()
  const isEditing = !!collection

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      active: true,
    },
  })

  useEffect(() => {
    if (open) {
      reset(
        collection
          ? {
              name: collection.name,
              description: collection.description ?? '',
              active: collection.active,
            }
          : { name: '', description: '', active: true },
      )
    }
  }, [open, collection, reset])

  async function onSubmit(values: FormValues) {
    try {
      if (isEditing && collection) {
        await update.mutateAsync({
          id: collection.id,
          request: {
            name: values.name,
            description: values.description || null,
            active: values.active,
          },
        })
      } else {
        await create.mutateAsync({
          name: values.name,
          description: values.description || null,
          active: values.active,
        })
      }
      onOpenChange(false)
    } catch {
      // error handled by mutation
    }
  }

  const isPending = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Sửa collection' : 'Tạo collection'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tên</Label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input
                  id="name"
                  {...field}
                  placeholder="Ví dụ: Yêu cầu HR"
                  maxLength={200}
                />
              )}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Textarea
                  id="description"
                  {...field}
                  placeholder="Mô tả tuỳ chọn..."
                  rows={3}
                  maxLength={2000}
                />
              )}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="active">Hoạt động</Label>
            <Controller
              name="active"
              control={control}
              render={({ field }) => (
                <Switch
                  id="active"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Huỷ
            </Button>
            <Button type="submit" disabled={isPending || isSubmitting}>
              {isPending || isSubmitting
                ? 'Đang lưu…'
                : isEditing
                  ? 'Lưu'
                  : 'Tạo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
