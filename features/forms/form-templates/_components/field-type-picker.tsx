'use client'
// ---------------------------------------------------------------------------
// _components/field-type-picker.tsx
// Field type selector with a 2-column icon grid in a shadcn Popover.
// Mirrors the building-blocks grid visual for consistency.
// ---------------------------------------------------------------------------

import { useRef, useState } from 'react'
import {
  AlignLeft,
  Building,
  Building2,
  Calendar,
  CheckSquare,
  ChevronDown,
  GraduationCap,
  Hash,
  ListChecks,
  Mail,
  Paperclip,
  Phone,
  Star,
  Type,
  User,
  UserCheck,
} from 'lucide-react'
import { ALL_FIELD_TYPES, FIELD_TYPE_LABELS } from '@/features/lms/types/form-template'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

// Map FieldType numeric values → lucide icons.  Values match FieldType enum
// (1=ShortText, 2=LongText, 3=Date, 4=Dropdown, 5=CheckBox, 6=Multiple,
// 7=Attachment, 8=Email, 9=Number, 10=PickUser, 11=PickStudent,
// 12=PickClass, 13=PhoneNumber, 14=Facilities, 15=Rating, 16=PickStudentWithClass).
const FIELD_TYPE_ICONS: Record<number, React.ElementType> = {
  1: Type,
  2: AlignLeft,
  3: Calendar,
  4: ListChecks,
  5: CheckSquare,
  6: CheckSquare,
  7: Paperclip,
  8: Mail,
  9: Hash,
  10: User,
  11: GraduationCap,
  12: Building2,
  13: Phone,
  14: Building,
  15: Star,
  16: UserCheck,
}

interface FieldTypePickerProps {
  value: number
  onChange: (type: number) => void
  disabled?: boolean
}

export function FieldTypePicker({ value, onChange, disabled }: FieldTypePickerProps) {
  const [open, setOpen] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)

  const selectedLabel = FIELD_TYPE_LABELS[value] ?? 'Unknown'
  const SelectedIcon = FIELD_TYPE_ICONS[value]

  // Keyboard navigation: arrow keys wrap around the 2-column grid.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const cols = 2
    const items = ALL_FIELD_TYPES
    const currentIndex = items.findIndex((f) => f.value === value)
    const wrap = (n: number) => ((n % items.length) + items.length) % items.length

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault()
        onChange(items[wrap(currentIndex + 1)].value)
        break
      case 'ArrowLeft':
        e.preventDefault()
        onChange(items[wrap(currentIndex - 1)].value)
        break
      case 'ArrowDown':
        e.preventDefault()
        onChange(items[wrap(currentIndex + cols)].value)
        break
      case 'ArrowUp':
        e.preventDefault()
        onChange(items[wrap(currentIndex - cols)].value)
        break
      case 'Enter':
      case ' ':
        setOpen(false)
        break
      case 'Escape':
        setOpen(false)
        break
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="flex items-center gap-2 truncate">
            {SelectedIcon && (
              <SelectedIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate">{selectedLabel}</span>
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[280px] p-2"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* 2-column icon grid with ARIA listbox pattern */}
        <div
          ref={gridRef}
          role="listbox"
          aria-label="Chọn kiểu trường"
          className="grid grid-cols-2 gap-1"
          onKeyDown={handleKeyDown}
        >
          {ALL_FIELD_TYPES.map(({ value: v, label }) => {
            const Icon = FIELD_TYPE_ICONS[v]
            const isSelected = v === value

            return (
              <button
                key={v}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(v)
                  setOpen(false)
                }}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  isSelected
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                <span className="truncate">{label}</span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
