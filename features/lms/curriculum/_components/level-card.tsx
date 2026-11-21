'use client'
// ---------------------------------------------------------------------------
// _components/level-card.tsx
// Single study level card in the left panel
// Triggers: select level, edit, delete, duplicate, view lessons, score frame
// ---------------------------------------------------------------------------

import {
  LayoutList,
  Pencil,
  Trash2,
  Copy,
  Clock,
  BookOpen,
  ListChecks,
  MoreVertical,
} from 'lucide-react'
import { useRouter } from '@/features/lms/port-support'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCurriculumStore } from '@/features/lms/stores/use-curriculum-store'
import { useDuplicateStudyLevel } from '@/features/lms/hooks/curriculum/use-study-levels'
import { usePermission } from '@/features/lms/port-support'
import type { LevelListItem } from '@/features/lms/types/curriculum'

interface LevelCardProps {
  level: LevelListItem
  isSelected: boolean
  onSelect: () => void
  onDelete: (level: LevelListItem) => void
}

export function LevelCard({ level, isSelected, onSelect, onDelete }: LevelCardProps) {
  const router = useRouter()
  const openEditLevel = useCurriculumStore((s) => s.openEditLevel)
  const { mutate: duplicateLevel, isPending: isDuplicating } = useDuplicateStudyLevel()
  const { can } = usePermission()
  const canUpdateLevel = can('curriculum.update')
  const canCreateLevel = can('curriculum.create')
  const canDeleteLevel = can('curriculum.delete')

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={cn(
        'group relative flex flex-col gap-2 rounded-lg border p-3 cursor-pointer transition-all',
        'hover:border-primary/50 hover:shadow-sm',
        isSelected
          ? 'border-primary ring-1 ring-primary bg-primary/5'
          : 'border-border bg-card',
      )}
    >
      {/* Name + overflow menu */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm leading-tight line-clamp-2 flex-1">{level.name}</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {canUpdateLevel && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  openEditLevel(level)
                }}
              >
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Edit level
              </DropdownMenuItem>
            )}
            {canCreateLevel && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  duplicateLevel(level.id)
                }}
                disabled={isDuplicating}
              >
                <Copy className="mr-2 h-3.5 w-3.5" />
                Duplicate
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/curriculum/levels/${level.id}/exam`)
              }}
            >
              <ListChecks className="mr-2 h-3.5 w-3.5" />
              Score Frame
            </DropdownMenuItem>
            {canDeleteLevel && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(level)
                  }}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete level
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Description */}
      {level.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{level.description}</p>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <BookOpen className="h-3 w-3" />
          {level.numberOfLesson} lessons
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {level.lessonTime} min
        </span>
      </div>

      <Separator />

      {/* Quick action row */}
      <div className="flex items-center gap-1 -mb-1" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs flex-1 justify-start gap-1.5"
          onClick={() => onSelect()}
        >
          <LayoutList className="h-3.5 w-3.5" />
          View Lessons
        </Button>
      </div>
    </div>
  )
}
