'use client'
// ---------------------------------------------------------------------------
// _components/field-type-config.tsx
// Per-type configuration controls (options, formats, limits) for a single
// form field. Shared by the builder's inline canvas and the worklog editor so
// both surfaces stay behaviourally identical.
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import type { NewField, UpsertField } from '@/features/lms/types/form-template'

type Field = NewField | UpsertField
type Update = (patch: Partial<Field>) => void

/**
 * The default config for a freshly-created field of the given type.
 *
 * Shared by every surface that creates a field — the builder's inline canvas, the
 * compact worklog editor, and the create-template flow — so a field authored in one
 * surface behaves identically to the same field authored in another.
 */
export function buildDefaultConfig(type: number): Record<string, unknown> {
  switch (type) {
    case 2: // Date
      return { format: "dd/MM/yyyy" }
    case 8: // Number
      // "Allow negative" is expressed through a negative min rather than a separate
      // flag, so the contract stays a single number. An omitted min means unbounded.
      return { min: 0, max: undefined, allowNegative: false }
    case 14: // Rating
      return { max: 5, precision: 1, iconType: "star" }
    default:
      return {}
  }
}

export function TypeSpecificConfig({
  field,
  onUpdate,
}: {
  field: Field
  onUpdate: Update
}) {
  switch (field.type) {
    case 0: // ShortText
    case 1: // LongText
    case 7: // Email
    case 12: // PhoneNumber
      return <TextConfig field={field} onUpdate={onUpdate} />

    case 2: // Date
      return <DateConfig field={field} onUpdate={onUpdate} />

    case 3: // Dropdown
      return <DropdownConfig field={field} onUpdate={onUpdate} />

    case 5: // MultipleCheckBox
      return <MultipleCheckboxConfig field={field} onUpdate={onUpdate} />

    case 6: // Attachment
      return <AttachmentConfig field={field} onUpdate={onUpdate} />

    case 8: // Number
      return <NumberConfig field={field} onUpdate={onUpdate} />

    case 14: // Rating
      return <RatingConfig field={field} onUpdate={onUpdate} />

    default:
      return null
  }
}

function TextConfig({ field, onUpdate }: { field: Field; onUpdate: Update }) {
  const config = (field.config as { maxLength?: number }) ?? {}
  return (
    <div>
      <Label className="text-xs">Độ dài tối đa</Label>
      <Input
        type="number"
        value={config.maxLength ?? ''}
        onChange={(e) =>
          onUpdate({
            config: {
              ...config,
              maxLength: e.target.value ? Number(e.target.value) : undefined,
            },
          })
        }
        placeholder="Không giới hạn"
        className="mt-1 h-8"
      />
    </div>
  )
}

function DateConfig({ field, onUpdate }: { field: Field; onUpdate: Update }) {
  const config = (field.config as { format?: string }) ?? {}
  const [showTime, setShowTime] = useState(
    config.format?.includes('HH:mm') ?? false,
  )
  const [format, setFormat] = useState(config.format || 'dd/MM/yyyy')

  const handleShowTimeChange = (checked: boolean) => {
    setShowTime(checked)
    // The format string itself carries the time component, so toggling
    // "show time" is expressed as adding/removing the HH:mm segment.
    const newFormat =
      checked && !format.includes('HH:mm')
        ? `${format} HH:mm`
        : format.replace(' HH:mm', '')
    setFormat(newFormat)
    onUpdate({ config: { format: newFormat } })
  }

  return (
    <div className="space-y-2">
      <div>
        <Label className="text-xs">Định dạng</Label>
        <Input
          value={format}
          onChange={(e) => {
            setFormat(e.target.value)
            onUpdate({ config: { format: e.target.value } })
          }}
          placeholder="dd/MM/yyyy"
          className="mt-1 h-8"
        />
      </div>
      <label className="flex items-center gap-2 text-xs">
        <Checkbox checked={showTime} onCheckedChange={handleShowTimeChange} />
        Hiển thị bộ chọn giờ
      </label>
    </div>
  )
}

interface OptionRowProps {
  option: { id: string; name: string }
  index: number
  onChange: (index: number, updates: Partial<{ id: string; name: string }>) => void
  onRemove: (index: number) => void
}

function OptionRow({ option, index, onChange, onRemove }: OptionRowProps) {
  return (
    <div className="flex gap-2">
      <Input
        value={option.name}
        onChange={(e) => onChange(index, { name: e.target.value })}
        placeholder="Nhãn lựa chọn"
        className="h-8"
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(index)}
        aria-label="Xoá lựa chọn"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

function DropdownConfig({ field, onUpdate }: { field: Field; onUpdate: Update }) {
  const config =
    (field.config as { options?: { id: string; name: string }[] }) ?? {}
  const options = config.options ?? []

  return (
    <div className="space-y-2">
      <Label className="text-xs">Tuỳ chọn</Label>
      {options.map((opt, i) => (
        <OptionRow
          key={opt.id}
          option={opt}
          index={i}
          onChange={(index, updates) => {
            const next = [...options]
            next[index] = { ...next[index], ...updates }
            onUpdate({ config: { options: next } })
          }}
          onRemove={(index) =>
            onUpdate({ config: { options: options.filter((_, x) => x !== index) } })
          }
        />
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          onUpdate({
            config: {
              options: [...options, { id: crypto.randomUUID(), name: '' }],
            },
          })
        }
      >
        <Plus className="mr-1 h-4 w-4" />
        Thêm tuỳ chọn
      </Button>
    </div>
  )
}

function MultipleCheckboxConfig({
  field,
  onUpdate,
}: {
  field: Field
  onUpdate: Update
}) {
  const config =
    (field.config as {
      options?: { id: string; name: string }[]
      multiple?: boolean
    }) ?? {}
  const options = config.options ?? []

  return (
    <div className="space-y-2">
      <Label className="text-xs">Tuỳ chọn</Label>
      {options.map((opt, i) => (
        <OptionRow
          key={opt.id}
          option={opt}
          index={i}
          onChange={(index, updates) => {
            const next = [...options]
            next[index] = { ...next[index], ...updates }
            onUpdate({ config: { ...config, options: next } })
          }}
          onRemove={(index) =>
            onUpdate({
              config: {
                ...config,
                options: options.filter((_, x) => x !== index),
              },
            })
          }
        />
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          onUpdate({
            config: {
              ...config,
              options: [...options, { id: crypto.randomUUID(), name: '' }],
            },
          })
        }
      >
        <Plus className="mr-1 h-4 w-4" />
        Thêm tuỳ chọn
      </Button>
      <label className="flex items-center gap-2 text-xs">
        <Checkbox
          checked={config.multiple ?? false}
          onCheckedChange={(v) => onUpdate({ config: { ...config, multiple: !!v } })}
        />
        Cho phép chọn nhiều
      </label>
    </div>
  )
}

function AttachmentConfig({ field, onUpdate }: { field: Field; onUpdate: Update }) {
  const config = (field.config as { maxFiles?: number }) ?? {}
  return (
    <div>
      <Label className="text-xs">Số tệp tối đa</Label>
      <Input
        type="number"
        value={config.maxFiles ?? ''}
        onChange={(e) =>
          onUpdate({
            config: {
              ...config,
              maxFiles: e.target.value ? Number(e.target.value) : undefined,
            },
          })
        }
        placeholder="Không giới hạn"
        className="mt-1 h-8"
      />
    </div>
  )
}

function NumberConfig({ field, onUpdate }: { field: Field; onUpdate: Update }) {
  const config =
    (field.config as {
      min?: number
      max?: number
      format?: string
      allowNegative?: boolean
    }) ?? {}

  // "Allow negative" is a flag on the authoring contract. It maps onto an omitted
  // (unbounded) min rather than -Infinity, which cannot round-trip through JSON.
  const allowNegative = config.allowNegative ?? (config.min ?? 0) < 0

  const setAllowNegative = (allow: boolean) => {
    onUpdate({
      config: {
        ...config,
        allowNegative: allow,
        min: allow ? undefined : config.min !== undefined && config.min < 0 ? 0 : config.min,
      },
    })
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Nhỏ nhất</Label>
          <Input
            type="number"
            value={config.min ?? ''}
            onChange={(e) =>
              onUpdate({
                config: {
                  ...config,
                  min: e.target.value ? Number(e.target.value) : undefined,
                },
              })
            }
            className="mt-1 h-8"
          />
        </div>
        <div>
          <Label className="text-xs">Lớn nhất</Label>
          <Input
            type="number"
            value={config.max ?? ''}
            onChange={(e) =>
              onUpdate({
                config: {
                  ...config,
                  max: e.target.value ? Number(e.target.value) : undefined,
                },
              })
            }
            className="mt-1 h-8"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Định dạng</Label>
        <Select
          value={config.format ?? "none"}
          onValueChange={(v) =>
            onUpdate({
              config: { ...config, format: v === "none" ? undefined : v },
            })
          }
        >
          <SelectTrigger className="mt-1 h-8">
            <SelectValue placeholder="Không" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Không</SelectItem>
            <SelectItem value="#,##">Dấu phân cách nghìn (#,##)</SelectItem>
            <SelectItem value="#K">Nghìn (K)</SelectItem>
            <SelectItem value="#%">Phần trăm (%)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <label className="flex items-center gap-2 text-xs">
        <Checkbox
          checked={allowNegative}
          onCheckedChange={(v) => setAllowNegative(Boolean(v))}
        />
        Cho phép số âm
      </label>
    </div>
  )
}

function RatingConfig({ field, onUpdate }: { field: Field; onUpdate: Update }) {
  const config =
    (field.config as {
      max?: number
      precision?: number
      iconType?: string
    }) ?? {}
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Số sao tối đa</Label>
          <Input
            type="number"
            value={config.max ?? 5}
            onChange={(e) =>
              onUpdate({ config: { ...config, max: Number(e.target.value) } })
            }
            className="mt-1 h-8"
          />
        </div>
        <div>
          <Label className="text-xs">Độ chính xác</Label>
          <Input
            type="number"
            step="0.1"
            value={config.precision ?? 1}
            onChange={(e) =>
              onUpdate({ config: { ...config, precision: Number(e.target.value) } })
            }
            className="mt-1 h-8"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Biểu tượng</Label>
        <Select
          value={config.iconType ?? "star"}
          onValueChange={(v) =>
            onUpdate({ config: { ...config, iconType: v } })
          }
        >
          <SelectTrigger className="mt-1 h-8">
            <SelectValue placeholder="Ngôi sao" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="star">Ngôi sao</SelectItem>
            <SelectItem value="heart">Trái tim</SelectItem>
            <SelectItem value="thumb-up">Ngón cái lên</SelectItem>
            <SelectItem value="emoji-happy">Mặt cười</SelectItem>
            <SelectItem value="check-circle">Vòng tròn dấu tick</SelectItem>
            <SelectItem value="flag">Cờ</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
