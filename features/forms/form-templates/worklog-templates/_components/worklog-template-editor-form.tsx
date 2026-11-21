'use client'

// ---------------------------------------------------------------------------
// _components/worklog-template-editor-form.tsx — Shared WorkLog template editor
//
// Uses the shared FIELD_TYPE_LABELS + Field shape from form-templates types to
// avoid duplicating the 16-type enum table, and the shared FieldCanvas as the
// single field-editing surface so a WorkLog field is configured exactly like a
// request-form field (per-type config, options, validation, reorder).
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  type UpsertField,
  type TemplateDetail,
} from '@/features/lms/types/form-template'
import { FieldType } from '@/features/lms/types/form-template'
import { FieldCanvas } from '../../_components/field-canvas'
import { buildDefaultConfig } from '../../_components/field-type-config'
import { useCollections } from '@/features/lms/hooks/form-templates/use-collections'

// ---------------------------------------------------------------------------
// Main editor form
// ---------------------------------------------------------------------------

interface Props {
  initialData?: TemplateDetail
  onSubmit: (data: {
    name: string
    description?: string | null
    collectionId?: string | null
    fields: Array<{
      id?: string | null
      fieldName: string
      label: string
      description?: string | null
      type: number
      inputKey: string
      required: boolean
      displayOrder: number
      hidden: boolean
      config: Record<string, unknown>
    }>
  }) => void
  onCancel: () => void
}

export function WorkLogTemplateEditorForm({ initialData, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [collectionId, setCollectionId] = useState<string | null>(
    initialData?.collectionId ?? null,
  )
  const [fields, setFields] = useState<UpsertField[]>(
    initialData?.fields.map((f) => ({
      id: f.id,
      fieldName: f.fieldName,
      label: f.label,
      description: f.description ?? null,
      type: f.type,
      inputKey: f.inputKey,
      required: f.required,
      displayOrder: f.displayOrder,
      hidden: f.hidden,
      config: f.config as Record<string, unknown>,
    })) ?? [],
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const collectionsQuery = useCollections()

  function addField() {
    setFields([
      ...fields,
      {
        id: undefined,
        // A stable client id keeps the canvas block keyed to this field even
        // after a rename or a reorder.
        clientId: crypto.randomUUID(),
        fieldName: '',
        label: '',
        description: null,
        type: FieldType.ShortText,
        inputKey: '',
        required: false,
        displayOrder: fields.length,
        hidden: false,
        config: buildDefaultConfig(FieldType.ShortText),
      },
    ])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setIsSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        collectionId: collectionId || null,
        fields: fields.map((f, i) => ({
          id: f.id ?? null,
          fieldName: f.fieldName,
          label: f.label,
          description: f.description || null,
          type: f.type,
          inputKey: f.inputKey || f.fieldName,
          required: f.required,
          displayOrder: i,
          hidden: f.hidden,
          config: f.config,
        })),
      })
    } catch (error) {
      // The server rejects a duplicate inputKey/fieldName with a 422
      // ProblemDetails; show its detail instead of failing silently.
      toast.error(
        error instanceof Error ? error.message : 'Không lưu được mẫu worklog',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">
      {/* Basic info */}
      <Card className="p-6">
        <h2 className="mb-4 font-semibold">Thông tin mẫu</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Tên *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Nhật ký giờ dạy hằng ngày"
              required
            />
          </div>
          <div>
            <Label htmlFor="collectionId">Collection</Label>
            <Select
              value={collectionId ?? 'none'}
              onValueChange={(v) => setCollectionId(v === 'none' ? null : v)}
              disabled={collectionsQuery.isLoading}
            >
              <SelectTrigger id="collectionId">
                <SelectValue placeholder="Không thuộc collection" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Không thuộc collection</SelectItem>
                {(collectionsQuery.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả tuỳ chọn..."
              rows={2}
            />
          </div>
        </div>
      </Card>

      {/* Fields */}
      <Card className="flex-1 min-h-0 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Trường ({fields.length})</h2>
          <Button type="button" variant="outline" size="sm" onClick={addField}>
            <Plus className="h-4 w-4 mr-1" />
            Thêm trường
          </Button>
        </div>

        <ScrollArea className="h-[calc(100%-3rem)]">
          <FieldCanvas fields={fields} onChange={setFields} />
        </ScrollArea>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Huỷ
        </Button>
        <Button type="submit" disabled={isSubmitting || !name.trim()}>
          {isSubmitting
            ? 'Đang lưu…'
            : initialData
              ? 'Lưu thay đổi'
              : 'Tạo mẫu'}
        </Button>
      </div>
    </form>
  )
}
