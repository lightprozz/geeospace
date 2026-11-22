'use client'
// ---------------------------------------------------------------------------
// _components/field-canvas.tsx
// The builder's single field-editing surface. Each field renders as a paper
// block that previews its real input; clicking a block turns its label into a
// text input and reveals a per-field toolbar (required / copy / delete /
// reorder). Config that needs more room (options, formats, limits) expands in
// place below the preview.
//
// A block is also a reorder target: the grip is a dnd-kit handle, so the
// order can be changed by pointer or by keyboard (Space picks a block up,
// the arrow keys move it, Space drops it). The up/down buttons stay as the
// explicit, discoverable alternative.
// ---------------------------------------------------------------------------

import { useMemo, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldTypePicker } from './field-type-picker'
import { TypeSpecificConfig, buildDefaultConfig } from './field-type-config'
import { FIELD_TYPE_LABELS, type NewField, type UpsertField } from '@/features/lms/types/form-template'
import { deriveFieldName, deriveInputKey } from '../lib/validation'
import { cn } from '@/lib/utils'
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Copy,
  Paperclip,
  Trash2,
  GripVertical,
} from 'lucide-react'

type EditableField = NewField | UpsertField

export interface FieldCanvasProps {
  fields: EditableField[]
  onChange: (fields: EditableField[]) => void
  /** Id/clientId of the field that should open expanded on mount. */
  focusId?: string | null
}

export function FieldCanvas({ fields, onChange, focusId }: FieldCanvasProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  // Stable identity per field. A persisted field is addressed by its server
  // id; a not-yet-persisted one by the `clientId` the editor assigned on
  // creation. The position-based fallback only applies to fields that
  // predate the client id, so a rename or a reorder never re-keys a block.
  const keyOf = (field: EditableField, index: number) =>
    (field as UpsertField).id ?? field.clientId ?? `new-${index}`

  // `focusId` lets the caller select and expand a field after the fact — used
  // when a field is added from the Building Blocks rail so the new block opens
  // ready for its label. Comparing the resolved key keeps this stable when the
  // caller passes a field id rather than a synthetic position key.
  const focusKey = focusId ?? null
  const focusResolved = useMemo(() => {
    if (focusKey === null) return null
    const index = fields.findIndex(
      (f, i) => focusKey === keyOf(f, i) || focusKey === f.inputKey,
    )
    return index === -1 ? null : keyOf(fields[index], index)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey])

  // Adjust selection during render rather than in an effect: a focus target
  // that changed since the last render is applied immediately, which avoids
  // the cascading second render an effect would cause.
  const [appliedFocus, setAppliedFocus] = useState<string | null>(null)
  if (focusResolved && focusResolved !== appliedFocus) {
    setAppliedFocus(focusResolved)
    setActiveId(focusResolved)
  }

  const updateAt = (index: number, patch: Partial<EditableField>) => {
    const next = [...fields]
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  const removeAt = (index: number) => {
    onChange(fields.filter((_, i) => i !== index))
  }

  const duplicateAt = (index: number) => {
    const source = fields[index]
    const copy: EditableField = {
      ...source,
      ...(('id' in source) ? { id: undefined } : {}),
      // A copy is a new field, so it needs its own client id — reusing the
      // source's would make React collapse both blocks into one.
      clientId: crypto.randomUUID(),
      label: `${source.label || 'Field'} (copy)`,
      inputKey: source.inputKey ? `${source.inputKey}_copy` : '',
    }
    const next = [...fields]
    next.splice(index + 1, 0, copy)
    onChange(next.map((f, i) => ({ ...f, displayOrder: i })))
  }

  const moveAt = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= fields.length) return
    const next = [...fields]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next.map((f, i) => ({ ...f, displayOrder: i })))
  }

  // The drag sensors. The pointer sensor needs a small activation distance so
  // a click on the grip still registers as a click, and the keyboard sensor
  // makes the handle reachable and operable without a mouse.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const ids = fields.map((field, index) => keyOf(field, index))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return

    onChange(arrayMove(fields, oldIndex, newIndex).map((f, i) => ({ ...f, displayOrder: i })))
  }

  if (fields.length === 0) {
    return <EmptyCanvas />
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="rounded-2xl border border-border/60 bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          {fields.map((field, index) => (
            <FieldBlock
              key={ids[index]}
              field={field}
              index={index}
              total={fields.length}
              isActive={activeId === ids[index]}
              onSelect={setActiveId}
              onUpdate={updateAt}
              onRemove={removeAt}
              onDuplicate={duplicateAt}
              onMove={moveAt}
              takenKeys={fields
                .filter((_, i) => i !== index)
                .map((f) => f.inputKey)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

/** The single empty state of the canvas — no fields yet. */
function EmptyCanvas() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card px-8 py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-border bg-muted/50">
        <Paperclip className="h-8 w-8 text-muted-foreground opacity-50" />
      </div>
      <h3 className="mb-2 text-xl font-semibold tracking-tight text-foreground">
        Biểu mẫu chưa có trường nào
      </h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Chọn một loại trường ở bảng Building Blocks để bắt đầu xây dựng biểu
        mẫu.
      </p>
    </div>
  )
}

interface FieldBlockProps {
  field: EditableField
  index: number
  total: number
  isActive: boolean
  takenKeys: string[]
  onSelect: (key: string) => void
  onUpdate: (index: number, patch: Partial<EditableField>) => void
  onRemove: (index: number) => void
  onDuplicate: (index: number) => void
  onMove: (index: number, direction: 'up' | 'down') => void
}

/**
 * One field block.
 *
 * The block is focusable and behaves like a button (Enter / Space selects it)
 * so a keyboard user can reach any field without tabbing through every
 * control inside it. Keys pressed inside a control of the block are ignored,
 * so typing in the label input still types.
 */
function FieldBlock({
  field,
  index,
  total,
  isActive,
  takenKeys,
  onSelect,
  onUpdate,
  onRemove,
  onDuplicate,
  onMove,
}: FieldBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: fieldIdOf(field, index) })

  const key = fieldIdOf(field, index)
  const typeLabel = FIELD_TYPE_LABELS[field.type] ?? 'Field'

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Only the block itself reacts: a key pressed inside a control of the
    // block belongs to that control.
    if (event.target !== event.currentTarget) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onSelect(key)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(key)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={isActive}
      aria-label={field.label || `Trường ${index + 1}`}
      className={cn(
        'group relative border-l-4 transition-all duration-300',
        isActive
          ? 'border-l-primary bg-primary/5 py-8'
          : 'border-l-transparent py-6',
        !isActive && index !== total - 1 ? 'border-b border-border/40' : '',
        'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
        isDragging && 'z-10 opacity-80 shadow-lg',
      )}
    >
      {/* Reorder handle — only while this block is the active one */}
      {isActive ? (
        <div className="absolute -left-3.5 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-1 md:flex">
          <div className="flex flex-col rounded-md border border-border bg-background p-0.5 shadow-sm">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onMove(index, 'up')
              }}
              disabled={index === 0}
              className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-primary disabled:opacity-30"
              aria-label="Di chuyển trường lên trên"
            >
              <ChevronUp className="h-3 w-3" />
            </button>
            <button
              type="button"
              className="cursor-grab touch-none rounded-sm p-1 text-muted-foreground/40 transition-colors hover:text-foreground active:cursor-grabbing"
              aria-label={`Kéo để đổi vị trí trường ${field.label || index + 1}`}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="mx-auto h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onMove(index, 'down')
              }}
              disabled={index === total - 1}
              className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-primary disabled:opacity-30"
              aria-label="Di chuyển trường xuống dưới"
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-3 px-8">
        {/* Label row + toolbar */}
        <div className="flex items-start justify-between gap-4">
          {isActive ? (
            <Input
              value={field.label}
              onChange={(e) => {
                const label = e.target.value
                // M4: a new block derives its inputKey from the label
                // so the author does not have to invent one by hand.
                // An inputKey the author typed is never overwritten.
                const patch: Partial<EditableField> = { label }
                if (!field.inputKey.trim()) {
                  patch.inputKey = deriveInputKey(label, takenKeys)
                }
                if (!field.fieldName.trim()) {
                  patch.fieldName = deriveFieldName(label)
                }
                onUpdate(index, patch)
              }}
              onClick={(e) => e.stopPropagation()}
              placeholder="Câu hỏi…"
              aria-label="Nhãn hiển thị của trường"
              className="h-9 flex-1 border-0 border-b-2 border-primary/20 bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0 focus-visible:border-primary"
              autoFocus
            />
          ) : (
            <div className="flex flex-1 items-center gap-2 py-1">
              <span className="text-lg font-semibold text-foreground">
                {field.label || 'Trường chưa đặt tên'}
              </span>
              {field.required ? (
                <span className="text-destructive" aria-label="Bắt buộc">
                  *
                </span>
              ) : null}
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {typeLabel}
              </span>
            </div>
          )}

          {isActive ? (
            <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background p-1 shadow-sm">
              <label className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted">
                <Checkbox
                  checked={field.required}
                  onCheckedChange={(v) => onUpdate(index, { required: !!v })}
                  aria-label="Bắt buộc"
                  className="h-3.5 w-3.5"
                />
                Bắt buộc
              </label>
              <div className="mx-1 h-4 w-px bg-border" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDuplicate(index)
                }}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Nhân bản trường"
                title="Nhân bản"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(index)
                }}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label="Xóa trường"
                title="Xóa"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </div>

        {/* Live preview of the actual input */}
        <div className={cn('mt-2', !isActive && 'pointer-events-none opacity-90')}>
          <FieldPreview field={field} />
        </div>

        {/* Configuration */}
        {isActive ? (
          <div className="mt-3 rounded-lg border border-border bg-muted/20 p-4">
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Tên trường *</Label>
                <Input
                  value={field.fieldName}
                  onChange={(e) => onUpdate(index, { fieldName: e.target.value })}
                  placeholder="Tên nội bộ"
                  className="mt-1 h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Input Key *</Label>
                <Input
                  value={field.inputKey}
                  onChange={(e) => onUpdate(index, { inputKey: e.target.value })}
                  placeholder="Khoá duy nhất cho câu trả lời"
                  className="mt-1 h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <div className="mt-1">
                  <FieldTypePicker
                    value={field.type}
                    onChange={(type) =>
                      onUpdate(index, {
                        type,
                        config: buildDefaultConfig(type),
                        inputKey: field.inputKey || `field_${type}`,
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex items-end gap-4 pb-1">
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={field.hidden}
                    onCheckedChange={(v) => onUpdate(index, { hidden: !!v })}
                  />
                  Hidden
                </label>
              </div>
            </div>

            <TypeSpecificConfig
              field={field}
              onUpdate={(patch) => onUpdate(index, patch)}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Stable identity of a field: server id, else client id, else position. */
function fieldIdOf(field: EditableField, index: number): string {
  return (field as UpsertField).id ?? field.clientId ?? `new-${index}`
}

/** Non-interactive rendering of the real control for a given field type. */
function FieldPreview({ field }: { field: EditableField }) {
  const disabled = 'w-full cursor-not-allowed'

  switch (field.type) {
    case 0: // ShortText
    case 7: // Email
    case 9: // PickUser
    case 12: // PhoneNumber
    case 10: // PickStudent
    case 11: // PickClass
    case 15: // PickStudentWithClass
    case 13: // Facilities
      return (
        <Input
          disabled
          readOnly
          className={disabled}
          placeholder={placeholderFor(field)}
        />
      )
    case 1: // LongText
      return (
        <textarea
          disabled
          readOnly
          className="h-24 w-full cursor-not-allowed resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
          placeholder={placeholderFor(field)}
        />
      )
    case 2: // Date
      return (
        <div className="relative">
          <Input
            disabled
            readOnly
            className={`${disabled} pr-10`}
            placeholder="YYYY-MM-DD"
          />
          <Calendar className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
        </div>
      )
    case 3: // Dropdown
    case 4: // CheckBox
    case 5: // MultipleCheckBox
      return (
        <div className="rounded-md border border-input bg-background p-3 shadow-sm">
          <span className="text-sm text-muted-foreground">
            {placeholderFor(field)}
          </span>
        </div>
      )
    case 6: // Attachment
      return (
        <div className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-muted/20 p-6">
          <div className="rounded-full bg-background p-3 shadow-sm">
            <Paperclip className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="text-center">
            <span className="block text-sm font-medium text-foreground">
              Nhấp hoặc kéo tệp vào khu vực này
            </span>
            <span className="text-xs text-muted-foreground">
              Định dạng hỗ trợ: PDF, PNG, JPG (tối đa 5MB)
            </span>
          </div>
        </div>
      )
    case 8: // Number
      return (
        <Input
          disabled
          readOnly
          type="number"
          className={disabled}
          placeholder="Nhập tại đây…"
        />
      )
    case 14: // Rating
      return (
        <div className="rounded-md border border-input bg-background p-3 text-sm text-muted-foreground shadow-sm">
          Thang đánh giá
        </div>
      )
    default:
      return (
        <Input disabled readOnly className={disabled} placeholder="Nhập tại đây…" />
      )
  }
}

function placeholderFor(field: EditableField): string {
  const desc = field.description?.trim()
  if (desc) return desc
  return FIELD_TYPE_LABELS[field.type] ?? 'Nhập tại đây…'
}
