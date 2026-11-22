'use client'
// ---------------------------------------------------------------------------
// _components/category-filter.tsx
// Popover-based category filter — 22 checkboxes grouped by domain
// Filter mode: "any match" (OR) — show material if ANY selected flag is true
// ---------------------------------------------------------------------------

import { useMemo } from 'react'
import { ListFilter, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  MATERIAL_CATEGORIES,
  CATEGORY_GROUP_LABELS,
  type CategoryGroup,
  type MaterialCategoryFlags,
} from '@/features/lms/types/material'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CategoryFilterProps {
  /** Currently active filter flags (only truthy keys matter) */
  activeFlags: Partial<MaterialCategoryFlags>
  /** Called when user toggles a flag */
  onFlagsChange: (flags: Partial<MaterialCategoryFlags>) => void
  /** Reset all flags */
  onReset: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CategoryFilter({
  activeFlags,
  onFlagsChange,
  onReset,
}: CategoryFilterProps) {
  // Count of active filters for badge
  const activeCount = useMemo(
    () => Object.values(activeFlags).filter(Boolean).length,
    [activeFlags],
  )

  // Group categories by group key
  const grouped = useMemo(() => {
    const groups: Record<CategoryGroup, typeof MATERIAL_CATEGORIES> = {
      subject: [],
      book: [],
      level: [],
      code: [],
    }
    for (const cat of MATERIAL_CATEGORIES) {
      groups[cat.group].push(cat)
    }
    return groups
  }, [])

  function handleToggle(key: keyof MaterialCategoryFlags, checked: boolean) {
    onFlagsChange({ ...activeFlags, [key]: checked })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
        >
          <ListFilter className="h-3.5 w-3.5" />
          Categories
          {activeCount > 0 && (
            <Badge className="ml-0.5 h-4 min-w-4 px-1 rounded-full text-[10px] bg-primary text-primary-foreground">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 p-0"
      >
        <div className="p-3 space-y-3 max-h-80 overflow-y-auto scrollbar-thin">
          {(Object.keys(grouped) as CategoryGroup[]).map((groupKey, idx) => (
            <div key={groupKey}>
              {idx > 0 && <Separator className="mb-3" />}
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {CATEGORY_GROUP_LABELS[groupKey]}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {grouped[groupKey].map((cat) => (
                  <label
                    key={cat.key}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <Checkbox
                      id={`cat-filter-${cat.key}`}
                      checked={!!activeFlags[cat.key]}
                      onCheckedChange={(checked) =>
                        handleToggle(cat.key, !!checked)
                      }
                      className="h-3.5 w-3.5"
                    />
                    <Label
                      htmlFor={`cat-filter-${cat.key}`}
                      className="text-xs font-normal cursor-pointer group-hover:text-foreground"
                    >
                      {cat.label}
                    </Label>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer — reset */}
        {activeCount > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs gap-1.5 text-muted-foreground"
                onClick={onReset}
              >
                <RotateCcw className="h-3 w-3" />
                Reset filters
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
