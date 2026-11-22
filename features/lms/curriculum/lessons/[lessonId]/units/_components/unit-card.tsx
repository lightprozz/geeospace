'use client'
// ---------------------------------------------------------------------------
// _components/unit-card.tsx
// Sortable unit card — drag handle + content + select checkbox
// Uses dnd-kit useSortable hook
// ---------------------------------------------------------------------------

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Clock, GripVertical, MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UnitListItem } from '@/features/lms/types/curriculum'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SortableUnitCardProps {
  unit: UnitListItem
  isSelected: boolean
  isChecked: boolean
  /** Whether the caller may reorder units (drag handle hidden when false) */
  canReorder: boolean
  onClick: () => void
  onCheck: (checked: boolean) => void
}

export function SortableUnitCard({
  unit,
  isSelected,
  isChecked,
  canReorder,
  onClick,
  onCheck,
}: SortableUnitCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: unit.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={cn(
        'relative bg-background border rounded-xl p-4 shadow-sm cursor-pointer transition-all hover:shadow-md flex items-start gap-4',
        isSelected ? 'border-primary ring-1 ring-primary z-10' : 'border-border',
        isDragging && 'shadow-lg ring-1 ring-primary opacity-80 z-50',
      )}
    >
      {/* Checkbox */}
      <div
        className="pt-1"
        onClick={(e) => e.stopPropagation()} // prevent clicking from selecting row
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => onCheck(e.target.checked)}
          className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer accent-primary"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {/* Drag handle — hidden entirely when the caller lacks reorder permission */}
          {canReorder && (
            <button
              type="button"
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()} // prevent click conflicting with grab
              className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground transition-colors shrink-0 -ml-1 mr-1"
              aria-label="Drag to reorder"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}

          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground border border-border">
            Unit {unit.sortOrder}
          </span>
          <span className="flex items-center text-xs text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" /> {unit.time} mins
          </span>
        </div>
        <h4 className="text-base font-semibold text-foreground">{unit.procedures}</h4>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{unit.description || 'No description'}</p>
      </div>

      {/* Menu Actions (Optional, matches mockup 3 dots placeholder) */}
      <div className="relative group/menu shrink-0">
        <button
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full"
          onClick={(e) => {
            e.stopPropagation()
            // In future, a dropdown could open here if needed
          }}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
