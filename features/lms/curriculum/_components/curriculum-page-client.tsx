'use client'
// ---------------------------------------------------------------------------
// _components/curriculum-page-client.tsx
// Main 2-panel layout controller for Curriculum Management
// CLIENT — manages selectedLevel, opens create dialogs, mounts all dialogs
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { Plus, LayoutList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { PanelHeader } from '@/features/lms/port-support'
import { useCurriculumStore } from '@/features/lms/stores/use-curriculum-store'
import { usePermission } from '@/components/auth/permission-guard'
import { PERMISSIONS } from '@/lib/permissions'
import { LevelList } from './level-list'
import { LessonTable } from './lesson-table'
import { LevelUpsertDialog } from './level-upsert-dialog'
import { LevelDeleteDialog } from './level-delete-dialog'
import { LessonUpsertDialog } from './lesson-upsert-dialog'
import type { LevelListItem } from '@/features/lms/types/curriculum'

export function CurriculumPageClient() {
  const [selectedLevel, setSelectedLevel] = useState<LevelListItem | null>(null)
  const [levelToDelete, setLevelToDelete] = useState<LevelListItem | null>(null)

  const openCreateLevel = useCurriculumStore((s) => s.openCreateLevel)
  const { can } = usePermission()
  const canCreateLevel = can(PERMISSIONS.CURRICULUM_CREATE)

  // ── Inject breadcrumb + actions into shared header ──────────────
  const panelHeader = <PanelHeader config={{
    breadcrumbs: (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Curriculum Management</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    ),
    actions: canCreateLevel ? (
      <Button size="sm" onClick={openCreateLevel}>
        <Plus className="mr-1.5 h-4 w-4" />
        Add Level
      </Button>
    ) : undefined,
  }} />


  return (
    <div className="@container flex h-full min-w-0 flex-col">
      {panelHeader}
      {/* ── Two-panel body ───────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden @max-[700px]:flex-col">
        {/* Left panel — Level list */}
        <aside className="w-72 flex flex-col border-r bg-card shrink-0 overflow-hidden @max-[700px]:w-full @max-[700px]:max-h-44 @max-[700px]:border-b">
          <LevelList
            selectedLevelId={selectedLevel?.id ?? ''}
            onSelectLevel={setSelectedLevel}
            onDeleteLevel={setLevelToDelete}
          />
        </aside>

        {/* Right panel — Lesson table or empty state */}
        <main className="min-w-0 min-h-0 flex-1 flex flex-col overflow-hidden bg-background">
          {selectedLevel ? (
            <LessonTable level={selectedLevel} />
          ) : (
            <EmptySelectState />
          )}
        </main>
      </div>

      {/* ── Mounted Dialogs (at page root — outside panels) ──────── */}
      <LevelUpsertDialog />
      <LevelDeleteDialog
        open={!!levelToDelete}
        level={levelToDelete}
        onClose={() => setLevelToDelete(null)}
      />
      {selectedLevel && (
        <LessonUpsertDialog levelId={selectedLevel.id} />
      )}
    </div>
  )
}

function EmptySelectState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center p-8">
      <div className="rounded-full bg-muted p-4">
        <LayoutList className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium text-sm">No level selected</p>
        <p className="text-xs text-muted-foreground mt-1">
          Select a study level from the left panel to view its lesson plans
        </p>
      </div>
    </div>
  )
}
