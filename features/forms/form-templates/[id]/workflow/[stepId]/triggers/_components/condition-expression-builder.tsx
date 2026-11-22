'use client'
// ---------------------------------------------------------------------------
// _components/condition-expression-builder.tsx
// Structured condition editor.
//
// The trigger stores one CEL-style expression string. This component edits
// that string as a list of rows — inputKey / operator / value — joined by AND
// or OR, so the author never has to type a CEL expression by hand.
//
// The raw expression stays reachable: the builder can switch to a raw editor,
// so an expression the parser cannot read is never silently dropped.
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
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
import type { ParamDto } from '../types/trigger'
import {
  CONDITION_OPERATORS,
  createConditionRowId,
  parseConditions,
  serializeConditions,
  validateConditions,
  type ConditionRow,
} from '../lib/condition-expression'

interface ConditionExpressionBuilderProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  /** The template's field keys, used to pick the `inputKey` of a row. */
  inputKeys?: ParamDto[]
}

export function ConditionExpressionBuilder({
  value,
  onChange,
  disabled,
  inputKeys = [],
}: ConditionExpressionBuilderProps) {
  const [rows, setRows] = useState<ConditionRow[]>(() => parseConditions(value))
  const [rawMode, setRawMode] = useState(false)

  const emit = (next: ConditionRow[]) => {
    setRows(next)
    onChange(serializeConditions(next))
  }

  const updateRow = (id: string, patch: Partial<ConditionRow>) => {
    emit(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const removeRow = (id: string) => {
    emit(rows.filter((r) => r.id !== id))
  }

  const addRow = () => {
    emit([
      ...rows,
      {
        id: createConditionRowId(),
        inputKey: '',
        operator: '==',
        value: '',
        logic: 'AND',
      },
    ])
  }

  const toggleLogic = (id: string) => {
    const row = rows.find((r) => r.id === id)
    if (!row) return
    updateRow(id, { logic: row.logic === 'AND' ? 'OR' : 'AND' })
  }

  // Leaving the raw editor re-reads the current expression, so a hand-written
  // expression is reflected in the rows instead of being overwritten.
  const enterStructuredMode = () => {
    setRows(parseConditions(value))
    setRawMode(false)
  }

  const validationError = validateConditions(rows)
  const serialized = serializeConditions(rows)

  if (rawMode) {
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Biểu thức điều kiện kiểu CEL. Trigger chỉ chạy khi biểu thức trả về
          đúng.
          <br />
          <code className="mt-1 block font-mono text-xs">
            Ví dụ: status == &quot;yes&quot; &amp;&amp; amount &gt; 1000
          </code>
        </div>
        <div className="space-y-1">
          <Label htmlFor="condition-expr">Biểu thức điều kiện</Label>
          <Input
            id="condition-expr"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder='e.g. fieldName == "approved"'
            disabled={disabled}
            className="font-mono text-sm"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={enterStructuredMode}
          disabled={disabled}
        >
          Quay lại trình soạn thảo dòng
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
        Trigger chỉ chạy khi các điều kiện đã chọn đều đúng.
        <br />
        <code className="mt-1 block font-mono text-xs">
          Ví dụ: status == &quot;yes&quot; &amp;&amp; amount &gt; 1000
        </code>
      </div>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            Chưa có điều kiện nào. Thêm một dòng để chỉ định khi nào trigger
            được kích hoạt.
          </p>
        ) : (
          rows.map((row, index) => {
            const operator = CONDITION_OPERATORS.find(
              (op) => op.value === row.operator,
            )
            const needsValue = !operator?.valueless
            return (
              <div key={row.id} className="space-y-2 rounded-md border p-2">
                <div className="flex items-center gap-2">
                  {index > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toggleLogic(row.id)}
                      disabled={disabled}
                      className="min-w-16"
                    >
                      {row.logic === 'AND' ? 'VÀ' : 'HOẶC'}
                    </Button>
                  ) : (
                    <span className="min-w-16 text-center text-xs font-medium text-muted-foreground">
                      Nếu
                    </span>
                  )}
                  <span className="flex-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(row.id)}
                    disabled={disabled || rows.length === 1}
                    aria-label="Xoá điều kiện"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Select
                    value={row.inputKey || undefined}
                    onValueChange={(v) => updateRow(row.id, { inputKey: v })}
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-full" aria-label="Trường">
                      <SelectValue placeholder="Chọn trường" />
                    </SelectTrigger>
                    <SelectContent>
                      {inputKeys.map((key) => (
                        <SelectItem key={key.key} value={key.key}>
                          {key.value ? `${key.value} (${key.key})` : key.key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={row.operator}
                    onValueChange={(v) =>
                      updateRow(row.id, {
                        operator: v as ConditionRow['operator'],
                      })
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-full" aria-label="Toán tử">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITION_OPERATORS.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {needsValue && (
                  <Input
                    value={row.value}
                    onChange={(e) => updateRow(row.id, { value: e.target.value })}
                    placeholder="Giá trị"
                    disabled={disabled}
                    className="font-mono text-sm"
                  />
                )}
              </div>
            )
          })
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          disabled={disabled}
        >
          <Plus className="mr-2 h-4 w-4" />
          Thêm điều kiện
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setRawMode(true)}
          disabled={disabled}
        >
          Sửa biểu thức thô
        </Button>
      </div>

      <div className="space-y-1">
        <Label>Biểu thức kết quả</Label>
        <pre className="max-h-24 overflow-auto rounded bg-muted p-2 font-mono text-xs">
          {serialized || '—'}
        </pre>
        {validationError && (
          <p className="text-xs text-destructive">{validationError}</p>
        )}
      </div>
    </div>
  )
}
