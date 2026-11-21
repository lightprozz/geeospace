'use client'
// ---------------------------------------------------------------------------
// _components/material-upsert-dialog.tsx
// Unified Create/Edit Material dialog
// 2-step save: POST entity (JSON) → POST file upload (FormData)
// 22 category checkboxes + conditional format fields
// ---------------------------------------------------------------------------

import { useRef, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Paperclip, Upload, X } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { CategoryCheckboxGrid } from './category-checkbox-grid'
import { useCreateMaterial, useUpdateMaterial, useMaterial } from '@/features/lms/hooks/materials/use-materials'
import {
  UpsertMaterialSchema,
  MATERIAL_FORMAT_OPTIONS,
  FILE_UPLOAD_FORMATS,
  URL_FORMATS,
  FORMAT_FILE_ACCEPT,
  DEFAULT_CATEGORY_FLAGS,
  CATEGORY_FLAG_KEYS,
  type UpsertMaterialInput,
  type MaterialListItem,
  type MaterialDetail,
  type MaterialFormatInt,
  type MaterialCategoryFlags,
} from '@/features/lms/types/material'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MaterialUpsertDialogProps {
  open: boolean
  /** If provided → edit mode; if absent → create mode */
  material?: MaterialListItem
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MaterialUpsertDialog({
  open,
  material,
  onClose,
}: MaterialUpsertDialogProps) {
  const isEdit = !!material
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const { mutate: createMat, isPending: isCreating } = useCreateMaterial()
  const { mutate: updateMat, isPending: isUpdating } = useUpdateMaterial()
  const isPending = isCreating || isUpdating

  // Fetch full detail when editing (to get category flags + openNewTab)
  const { data: materialDetail } = useMaterial(material?.id ?? '')

  // ── Form setup ────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<UpsertMaterialInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(UpsertMaterialSchema) as any,
    defaultValues: buildDefaults(materialDetail),
  })

  // Reset form when material detail loads or dialog opens
  useEffect(() => {
    if (open) {
      reset(buildDefaults(materialDetail))
      setSelectedFile(null)
    }
  }, [open, materialDetail, reset])

  const selectedFormat = watch('materialFormat') as MaterialFormatInt | undefined
  const showFileUpload = selectedFormat
    ? FILE_UPLOAD_FORMATS.includes(selectedFormat)
    : false
  const showUrlField = selectedFormat
    ? URL_FORMATS.includes(selectedFormat)
    : false

  // Clear file when format changes to non-file format
  useEffect(() => {
    if (!showFileUpload) {
      setSelectedFile(null)
    }
    if (!showUrlField) {
      setValue('url', '')
      setValue('openNewTab', false)
    }
  }, [selectedFormat, showFileUpload, showUrlField, setValue])

  // ── Handlers ──────────────────────────────────────────────────────

  function handleClose() {
    reset(buildDefaults(undefined))
    setSelectedFile(null)
    onClose()
  }

  function handleCategoryChange(
    key: keyof MaterialCategoryFlags,
    value: boolean,
  ) {
    setValue(key, value, { shouldDirty: true })
  }

  function onSubmit(values: UpsertMaterialInput) {
    if (isEdit && material) {
      updateMat(
        { id: material.id, payload: values, file: selectedFile },
        { onSuccess: handleClose },
      )
    } else {
      createMat(
        { payload: values, file: selectedFile },
        { onSuccess: handleClose },
      )
    }
  }

  // ── Watch all category values for the grid ────────────────────────
  const categoryValues: MaterialCategoryFlags = {
    ...DEFAULT_CATEGORY_FLAGS,
    ...Object.fromEntries(
      CATEGORY_FLAG_KEYS.map((k) => [k, watch(k) ?? false]),
    ),
  } as MaterialCategoryFlags

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Material' : 'Create Material'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the material details below.'
              : 'Add a new material to the library. Teacher-created materials require admin approval.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="py-2">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* ── Left column: form fields (3/5) ───────────────── */}
            <div className="lg:col-span-3 space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="mat-name" className="text-xs">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="mat-name"
                  placeholder="e.g. Flashcards Unit 3"
                  {...register('name')}
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Format + Description — side by side on lg */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Format <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={
                      selectedFormat ? String(selectedFormat) : undefined
                    }
                    onValueChange={(v) =>
                      setValue('materialFormat', Number(v) as MaterialFormatInt, {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      {MATERIAL_FORMAT_OPTIONS.map((f) => (
                        <SelectItem
                          key={f.value}
                          value={String(f.value)}
                          className="text-xs"
                        >
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.materialFormat && (
                    <p className="text-xs text-destructive">
                      {errors.materialFormat.message}
                    </p>
                  )}
                </div>

                {/* URL — conditional (VideoLink format) */}
                {showUrlField && (
                  <div className="space-y-1.5">
                    <Label htmlFor="mat-url" className="text-xs">
                      URL Link
                    </Label>
                    <Input
                      id="mat-url"
                      type="url"
                      placeholder="https://..."
                      {...register('url')}
                      aria-invalid={!!errors.url}
                    />
                    {errors.url && (
                      <p className="text-xs text-destructive">
                        {errors.url.message}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Open new tab — conditional (VideoLink) */}
              {showUrlField && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={watch('openNewTab')}
                    onCheckedChange={(checked) =>
                      setValue('openNewTab', !!checked)
                    }
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-xs">Open in new tab</span>
                </label>
              )}

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="mat-desc" className="text-xs">
                  Description
                </Label>
                <Textarea
                  id="mat-desc"
                  placeholder="Optional description..."
                  rows={3}
                  className="resize-none text-sm"
                  {...register('description')}
                />
              </div>

              {/* File upload — conditional */}
              {showFileUpload && (
                <div className="space-y-1.5">
                  <Label className="text-xs">File Upload</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={
                      selectedFormat
                        ? FORMAT_FILE_ACCEPT[selectedFormat] ?? '*'
                        : '*'
                    }
                    className="hidden"
                    onChange={(e) =>
                      setSelectedFile(e.target.files?.[0] ?? null)
                    }
                  />
                  {selectedFile ? (
                    <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-2">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs truncate flex-1">
                        {selectedFile.name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => setSelectedFile(null)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="w-full flex flex-col items-center gap-2 rounded-md border-2 border-dashed border-muted-foreground/25 bg-muted/10 py-6 hover:border-primary/50 hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Click to upload or drag and drop
                      </span>
                      {material?.fileName && (
                        <span className="text-[10px] text-muted-foreground/60">
                          Current: {material.fileName}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── Right column: categories (2/5) ───────────────── */}
            <div className="lg:col-span-2 lg:border-l lg:pl-6">
              <p className="text-xs font-medium mb-3">Categories</p>
              <CategoryCheckboxGrid
                values={categoryValues}
                onChange={handleCategoryChange}
                disabled={isPending}
              />
            </div>
          </div>

          <Separator className="my-4" />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEdit ? 'Save Changes' : 'Create Material'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildDefaults(
  material?: MaterialDetail,
): UpsertMaterialInput {
  if (!material) {
    return {
      name: '',
      description: '',
      materialFormat: 0 as MaterialFormatInt,
      url: '',
      openNewTab: false,
      ...DEFAULT_CATEGORY_FLAGS,
    }
  }

  return {
    name: material.name,
    description: material.description ?? '',
    materialFormat: material.materialFormat ?? (0 as MaterialFormatInt),
    url: material.url ?? '',
    openNewTab: material.openNewTab,
    // Spread 22 category flags from material detail
    ...Object.fromEntries(
      CATEGORY_FLAG_KEYS.map((k) => [k, material[k]]),
    ),
  } as UpsertMaterialInput
}
