'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ParamDto } from '../types/trigger'

interface ParameterTableProps {
  value: ParamDto[]
  onChange: (value: ParamDto[]) => void
  disabled?: boolean
}

export function ParameterTable({ value, onChange, disabled }: ParameterTableProps) {
  const add = () => onChange([...value, { key: '', value: '' }])
  const update = (index: number, field: 'key' | 'value', val: string) => {
    const next = value.map((p, i) => i === index ? { ...p, [field]: val } : p)
    onChange(next)
  }
  const remove = (index: number) => onChange(value.filter((_, i) => i !== index))

  return (
    <div className="space-y-2">
      <div className="flex gap-2 text-xs font-medium text-muted-foreground">
        <span className="flex-1">Khoá</span>
        <span className="flex-1">Giá trị (hằng số hoặc {"{{inputKey}}"})</span>
        <span className="w-8" />
      </div>
      {value.map((param, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={param.key}
            onChange={(e) => update(i, 'key', e.target.value)}
            placeholder="Ví dụ: token"
            disabled={disabled}
            className="flex-1"
          />
          <Input
            value={param.value}
            onChange={(e) => update(i, 'value', e.target.value)}
            placeholder='e.g. {{authToken}}'
            disabled={disabled}
            className="flex-1 font-mono text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(i)}
            disabled={disabled}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} disabled={disabled}>
        <Plus className="mr-1 h-3 w-3" /> Thêm tham số
      </Button>
    </div>
  )
}
