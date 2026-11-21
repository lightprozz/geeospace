'use client'

import { KeyRound, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { HeaderDto } from '../types/trigger'
import { isMaskedValue } from '../types/trigger'

interface HeaderTableProps {
  value: HeaderDto[]
  onChange: (value: HeaderDto[]) => void
  disabled?: boolean
}

export function HeaderTable({ value, onChange, disabled }: HeaderTableProps) {
  const add = () => onChange([...value, { key: '', value: '' }])
  const update = (index: number, field: 'key' | 'value', val: string) => {
    const next = value.map((h, i) => i === index ? { ...h, [field]: val } : h)
    onChange(next)
  }
  const remove = (index: number) => onChange(value.filter((_, i) => i !== index))

  return (
    <div className="space-y-2">
      <div className="flex gap-2 text-xs font-medium text-muted-foreground">
        <span className="flex-1">Tên header</span>
        <span className="flex-1">Giá trị</span>
        <span className="w-8" />
      </div>
      {value.map((header, i) => {
        // P-H2: the BE masks stored header values for callers without
        // `forms.template.admin`. A masked value is read-only and is submitted
        // back unchanged, which the BE reads as "keep the stored secret".
        const masked = isMaskedValue(header.value)
        return (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={header.key}
              onChange={(e) => update(i, 'key', e.target.value)}
              placeholder="Ví dụ: Authorization"
              disabled={disabled}
              className="flex-1"
            />
            <Input
              value={header.value}
              onChange={(e) => update(i, 'value', e.target.value)}
              placeholder='Ví dụ: Bearer {{authToken}}'
              disabled={disabled || masked}
              readOnly={masked}
              title={masked ? 'Secret đã lưu — đã ẩn. Xoá để đặt giá trị mới.' : undefined}
              className="flex-1 font-mono text-sm"
            />
            {masked ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                aria-label="Thay secret đã lưu"
                title="Thay secret đã lưu"
                onClick={() => update(i, 'value', '')}
              >
                <KeyRound className="h-4 w-4 text-muted-foreground" />
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(i)}
              disabled={disabled}
              aria-label="Xoá header"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )
      })}
      <Button type="button" variant="outline" size="sm" onClick={add} disabled={disabled}>
        <Plus className="mr-1 h-3 w-3" /> Thêm header
      </Button>
    </div>
  )
}
