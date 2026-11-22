'use client'
// ---------------------------------------------------------------------------
// _components/category-dialog.tsx
// 21-checkbox category assignment for a LessonPlanUnit
// BUSINESS RULE: Setting any category → materialId = null
// ---------------------------------------------------------------------------

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useUpdateUnitPlan } from '@/features/lms/hooks/curriculum/use-unit-plans'
import { DEFAULT_CATEGORY } from '@/features/lms/types/curriculum'
import type { UnitListItem, UnitCategory } from '@/features/lms/types/curriculum'

// ---------------------------------------------------------------------------
// Category groups (21 total flags)
// ---------------------------------------------------------------------------

const CATEGORY_GROUPS = [
  {
    label: 'Subjects',
    keys: ['math', 'science', 'music', 'phonics', 'sightwords', 'english', 'softSkills'],
  },
  {
    label: 'Materials',
    keys: ['activityBook', 'studentBook', 'teacherPlanner'],
  },
  {
    label: 'Levels',
    keys: ['m0', 'm1', 'm2', 'm3'],
  },
  {
    label: 'Types',
    keys: ['a', 'm', 'e', 'v', 'c', 'j', 's'],
  },
] as const

const CATEGORY_DISPLAY: Record<string, string> = {
  math: 'Math', science: 'Science', music: 'Music', phonics: 'Phonics',
  sightwords: 'Sight Words', english: 'English', softSkills: 'Soft Skills',
  activityBook: 'Activity Book', studentBook: 'Student Book',
  teacherPlanner: 'Teacher Planner',
  m0: 'M0', m1: 'M1', m2: 'M2', m3: 'M3',
  a: 'A', m: 'M', e: 'E', v: 'V', c: 'C', j: 'J', s: 'S',
}

function parseCategory(json: string | null): UnitCategory {
  try {
    return json ? (JSON.parse(json) as UnitCategory) : { ...DEFAULT_CATEGORY }
  } catch {
    return { ...DEFAULT_CATEGORY }
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CategoryDialogProps {
  open: boolean
  unit: UnitListItem | null
  lessonId: string
  onClose: () => void
}

export function CategoryDialog({ open, unit, lessonId, onClose }: CategoryDialogProps) {
  const [categoryState, setCategoryState] = useState<UnitCategory>({ ...DEFAULT_CATEGORY })
  const { mutate: updateUnit, isPending } = useUpdateUnitPlan(lessonId)

  // Initialize category from unit when dialog opens
  useEffect(() => {
    if (unit) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCategoryState(parseCategory(unit.category ?? null))
    } else {
       
      setCategoryState({ ...DEFAULT_CATEGORY })
    }
  }, [unit])

  function toggle(key: keyof UnitCategory, checked: boolean) {
    setCategoryState((prev: UnitCategory) => ({ ...prev, [key]: checked }))
  }

  function handleSave() {
    if (!unit) return
    updateUnit(
      {
        id: unit.id,
        data: {
          ...unit,
          category: JSON.stringify(categoryState),
          materialId: null, // BUSINESS RULE: setting category clears materialId
        },
      },
      { onSuccess: onClose },
    )
  }

  function handleClearAll() {
    setCategoryState({ ...DEFAULT_CATEGORY })
  }

  const activeCount = Object.values(categoryState).filter(Boolean).length

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set Category</DialogTitle>
          <DialogDescription>
            Select applicable categories for this unit.{' '}
            {activeCount > 0 && (
              <span className="font-medium text-foreground">{activeCount} selected.</span>
            )}
            {' '}Setting a category will clear any material link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {CATEGORY_GROUPS.map((group, gi) => (
            <div key={group.label}>
              {gi > 0 && <Separator className="mb-4" />}
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {group.label}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {group.keys.map((key) => {
                  const k = key as keyof UnitCategory & string
                  return (
                    <div key={k} className="flex items-center gap-2">
                      <Checkbox
                        id={`cat-${k}`}
                        checked={categoryState[k]}
                        onCheckedChange={(checked) => toggle(k, !!checked)}
                      />
                      <Label
                        htmlFor={`cat-${k}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {CATEGORY_DISPLAY[k] ?? k}
                      </Label>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            disabled={isPending || activeCount === 0}
            className="mr-auto text-xs"
          >
            Clear all
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Category
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
