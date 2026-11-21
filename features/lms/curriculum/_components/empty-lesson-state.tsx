'use client'
// ---------------------------------------------------------------------------
// _components/empty-lesson-state.tsx
// Shown when a level has no lesson plans yet
// ---------------------------------------------------------------------------

import { BookOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCurriculumStore } from '@/features/lms/stores/use-curriculum-store'
import { usePermission } from '@/features/lms/port-support'

export function EmptyLessonState({ levelName }: { levelName: string }) {
  const openCreateLesson = useCurriculumStore((s) => s.openCreateLesson)
  const { can } = usePermission()
  const canCreateLesson = can('curriculum.create')

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-full bg-muted p-5">
        <BookOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-sm">No lesson plans yet</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          {levelName} has no lesson plans. Create the first one to get started.
        </p>
      </div>
      {canCreateLesson && (
        <Button size="sm" onClick={openCreateLesson}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Lesson Plan
        </Button>
      )}
    </div>
  )
}
