'use client'
// ---------------------------------------------------------------------------
// _components/level-list.tsx
// Left panel — scrollable list of study levels with filter input
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { Search, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useStudyLevels } from '@/features/lms/hooks/curriculum/use-study-levels'
import { LevelCard } from './level-card'
import type { LevelListItem } from '@/features/lms/types/curriculum'

interface LevelListProps {
  selectedLevelId: string
  onSelectLevel: (level: LevelListItem) => void
  onDeleteLevel: (level: LevelListItem) => void
}

export function LevelList({ selectedLevelId, onSelectLevel, onDeleteLevel }: LevelListProps) {
  const [filter, setFilter] = useState('')
  const { data: levels = [], isLoading, isError } = useStudyLevels()

  const filtered = levels.filter((l) =>
    l.name.toLowerCase().includes(filter.toLowerCase()),
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2.5 border-b space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Study Levels
          </span>
          {!isLoading && (
            <Badge variant="secondary" className="text-xs h-5">
              {levels.length}
            </Badge>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Filter levels..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Scrollable level cards */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1.5">
        {isError ? <p role="alert">Unable to load study levels.</p> : isLoading ? (
          // Skeleton loading — 4 placeholder cards
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
            <Plus className="h-6 w-6 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {filter ? 'No levels match filter' : 'No levels yet'}
            </p>
          </div>
        ) : (
          filtered.map((level) => (
            <LevelCard
              key={level.id}
              level={level}
              isSelected={level.id === selectedLevelId}
              onSelect={() => onSelectLevel(level)}
              onDelete={onDeleteLevel}
            />
          ))
        )}
      </div>
    </div>
  )
}
