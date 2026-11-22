'use client'
// ---------------------------------------------------------------------------
// _components/building-blocks-grid.tsx
// Right rail icon grid for adding fields by type.
// Mirrors the mockup's BuildingBlocks panel with Basic Types + Advanced
// Selection sections.
// ---------------------------------------------------------------------------

import {
  Type,
  AlignLeft,
  Calendar,
  ListChecks as DropdownIcon,
  CheckSquare,
  CheckSquare as MultipleCheckBoxIcon,
  Paperclip,
  Mail,
  Hash,
  User,
  GraduationCap,
  Building2,
  Phone,
  Building,
  Star,
  UserCheck,
} from 'lucide-react'
import {
  ALL_FIELD_TYPES,
  FieldType,
} from '@/features/lms/types/form-template'

// Map each FieldType to a lucide icon. Uses a flat list with the order
// matching ALL_FIELD_TYPES so the building blocks render left-to-right,
// top-to-bottom in section order.
const FIELD_TYPE_ICONS: Record<number, React.ElementType> = {
  [FieldType.ShortText]: Type,
  [FieldType.LongText]: AlignLeft,
  [FieldType.Date]: Calendar,
  [FieldType.Dropdown]: DropdownIcon,
  [FieldType.CheckBox]: CheckSquare,
  [FieldType.MultipleCheckBox]: MultipleCheckBoxIcon,
  [FieldType.Attachment]: Paperclip,
  [FieldType.Email]: Mail,
  [FieldType.Number]: Hash,
  [FieldType.PickUser]: User,
  [FieldType.PickStudent]: GraduationCap,
  [FieldType.PickClass]: Building2,
  [FieldType.PhoneNumber]: Phone,
  [FieldType.Facilities]: Building,
  [FieldType.Rating]: Star,
  [FieldType.PickStudentWithClass]: UserCheck,
}

// Section split: first 4 are Basic Types, the rest are Advanced Selection.
// Aligns with the mockup's grid which shows 4 items per section, then a
// remaining set under "Advanced Selection".
const BASIC_TYPES_COUNT = 4
const SECTION_HEADERS = {
  basic: 'Basic Types',
  advanced: 'Advanced Selection',
} as const

interface BuildingBlocksGridProps {
  onSelect: (type: number) => void
  disabled?: boolean
}

export function BuildingBlocksGrid({ onSelect, disabled }: BuildingBlocksGridProps) {
  // Materialize the list once so we can split it into two sections.
  const allTypes = ALL_FIELD_TYPES
  const basicTypes = allTypes.slice(0, BASIC_TYPES_COUNT)
  const advancedTypes = allTypes.slice(BASIC_TYPES_COUNT)

  return (
    <div className="space-y-6">
      <Section title={SECTION_HEADERS.basic} types={basicTypes} onSelect={onSelect} disabled={disabled} />
      <Section title={SECTION_HEADERS.advanced} types={advancedTypes} onSelect={onSelect} disabled={disabled} />
    </div>
  )
}

interface SectionProps {
  title: string
  types: Array<{ value: number; label: string }>
  onSelect: (type: number) => void
  disabled?: boolean
}

function Section({ title, types, onSelect, disabled }: SectionProps) {
  return (
    <div className="space-y-3">
      <h4 className="px-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {types.map(({ value, label }) => {
          const Icon = FIELD_TYPE_ICONS[value] ?? Type
          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelect(value)}
              disabled={disabled}
              aria-label={`Add ${label} field`}
              className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-2 py-4 text-muted-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary/5 hover:text-primary hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:border-border disabled:hover:bg-card disabled:hover:text-muted-foreground disabled:hover:shadow-sm"
            >
              <Icon className="h-5 w-5 opacity-70 transition-opacity group-hover:opacity-100" />
              <span className="text-center text-xs font-medium leading-tight text-foreground">
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
