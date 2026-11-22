'use client'
// ---------------------------------------------------------------------------
// _components/old-version-selector.tsx
// Dropdown to select an old (archived) lesson version to copy content from
// Only renders if oldVersions array is non-empty
// ---------------------------------------------------------------------------

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { RelatedLesson } from '@/features/lms/types/curriculum'

interface OldVersionSelectorProps {
  oldVersions: RelatedLesson[]
  onSelect: (lessonId: string | null) => void // null = reset to current
}

export function OldVersionSelector({ oldVersions, onSelect }: OldVersionSelectorProps) {
  if (oldVersions.length === 0) return null

  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2">
      <span className="text-xs text-amber-700 dark:text-amber-400 font-medium shrink-0">
        Copy from old version:
      </span>
      <Select
        onValueChange={(val) => onSelect(val === 'current' ? null : val)}
        defaultValue="current"
      >
        <SelectTrigger className="h-7 text-xs flex-1 max-w-xs">
          <SelectValue placeholder="Current version" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="current">Current version</SelectItem>
          {oldVersions.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              {v.subject ?? `Lesson ${v.lesson}`} — archived
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
