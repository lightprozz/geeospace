'use client'
// ---------------------------------------------------------------------------
// _components/category-checkbox-grid.tsx
// Reusable grouped checkbox grid for the 22 material category flags
// Used in: MaterialUpsertDialog (form-controlled) + CategoryFilter (standalone)
// ---------------------------------------------------------------------------

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  MATERIAL_CATEGORIES,
  CATEGORY_GROUP_LABELS,
  type CategoryGroup,
  type MaterialCategoryFlags,
} from '@/features/lms/types/material'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CategoryCheckboxGridProps {
  /** Current values for all 22 flags */
  values: MaterialCategoryFlags
  /** Called when a single flag is toggled */
  onChange: (key: keyof MaterialCategoryFlags, value: boolean) => void
  /** Disable all checkboxes (e.g. during form submission) */
  disabled?: boolean
}

// ---------------------------------------------------------------------------
// Pre-grouped categories (computed once at module level)
// ---------------------------------------------------------------------------

const GROUPED_CATEGORIES: Record<CategoryGroup, typeof MATERIAL_CATEGORIES> = {
  subject: MATERIAL_CATEGORIES.filter((c) => c.group === 'subject'),
  book: MATERIAL_CATEGORIES.filter((c) => c.group === 'book'),
  level: MATERIAL_CATEGORIES.filter((c) => c.group === 'level'),
  code: MATERIAL_CATEGORIES.filter((c) => c.group === 'code'),
}

const GROUP_ORDER: CategoryGroup[] = ['subject', 'book', 'level', 'code']

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CategoryCheckboxGrid({
  values,
  onChange,
  disabled = false,
}: CategoryCheckboxGridProps) {
  return (
    <div className="space-y-3">
      {GROUP_ORDER.map((groupKey, idx) => (
        <div key={groupKey}>
          {idx > 0 && <Separator className="mb-3" />}
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {CATEGORY_GROUP_LABELS[groupKey]}
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {GROUPED_CATEGORIES[groupKey].map((cat) => {
              const id = `cat-grid-${cat.key}`
              return (
                <label
                  key={cat.key}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <Checkbox
                    id={id}
                    checked={values[cat.key]}
                    onCheckedChange={(checked) =>
                      onChange(cat.key, !!checked)
                    }
                    disabled={disabled}
                    className="h-3.5 w-3.5"
                  />
                  <Label
                    htmlFor={id}
                    className="text-xs font-normal cursor-pointer group-hover:text-foreground"
                  >
                    {cat.label}
                  </Label>
                </label>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
