'use client'
// ---------------------------------------------------------------------------
// _components/unit-plan-page-client.tsx
// Main controller for Unit Plan page — dnd-kit drag-drop + multi-select + right pane
// ---------------------------------------------------------------------------

import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { Plus, Clock, AlertTriangle, Eye, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import { useUnitsByLesson, useReorderUnitPlans, useDeleteUnitPlan } from '@/features/lms/hooks/curriculum/use-unit-plans'
import { usePermission } from '@/components/auth/permission-guard'
import { PERMISSIONS } from '@/lib/permissions'
import { SortableUnitCard } from './unit-card'
import { UnitUpsertDialog } from './unit-upsert-dialog'
import { CategoryDialog } from './category-dialog'
import { EmptyUnitState } from './empty-unit-state'
import { UnitDetailPane } from './unit-detail-pane'
import type { LessonDetail, UnitListItem } from '@/features/lms/types/curriculum'

interface UnitPlanPageClientProps {
  lessonId: string
  lesson: LessonDetail
}

const EMPTY_UNITS: UnitListItem[] = []

export function UnitPlanPageClient({ lessonId, lesson }: UnitPlanPageClientProps) {
  const { can } = usePermission()
  const canCreateUnit = can(PERMISSIONS.CURRICULUM_CREATE)
  const canUpdateUnit = can(PERMISSIONS.CURRICULUM_UPDATE)
  const { data: units = EMPTY_UNITS, isLoading, isError } = useUnitsByLesson(lessonId)
  const { mutate: reorder } = useReorderUnitPlans(lessonId)
  const { mutate: deleteUnit, isPending: isDeleting } = useDeleteUnitPlan(lessonId)

  // URL State for selected unit
  const [unitId, setUnitId] = useState<string | null>(null)

  // Local drag-drop + multi-select state
  const [localUnits, setLocalUnits] = useState<UnitListItem[]>([])
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set())

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [unitToEdit, setUnitToEdit] = useState<UnitListItem | null>(null)
  const [unitToDelete, setUnitToDelete] = useState<UnitListItem | null>(null)
  const [categoryUnit, setCategoryUnit] = useState<UnitListItem | null>(null)

  // Sync from server data
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalUnits([...units].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)))
  }, [units])

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = localUnits.findIndex((u) => u.id === active.id)
    const newIndex = localUnits.findIndex((u) => u.id === over.id)
    const reordered = arrayMove(localUnits, oldIndex, newIndex).map((u, i) => ({
      ...u,
      sortOrder: i + 1,
    }))

    setLocalUnits(reordered) // optimistic update
    reorder(reordered.map((u) => ({ id: u.id, sortOrder: u.sortOrder })))
  }

  // --- Multi-select Handlers ---
  const isAllSelected = localUnits.length > 0 && selectedUnitIds.size === localUnits.length

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedUnitIds(new Set(localUnits.map((u) => u.id)))
    } else {
      setSelectedUnitIds(new Set())
    }
  }

  function handleCheckUnit(id: string, checked: boolean) {
    const next = new Set(selectedUnitIds)
    if (checked) next.add(id)
    else next.delete(id)
    setSelectedUnitIds(next)
  }

  // --- Delete Handler ---
  function executeDelete() {
    if (!unitToDelete) return
    deleteUnit(unitToDelete.id, {
      onSettled: () => {
        setUnitToDelete(null)
        if (unitId === unitToDelete.id) setUnitId(null)
        const nextSet = new Set(selectedUnitIds)
        nextSet.delete(unitToDelete.id)
        setSelectedUnitIds(nextSet)
      }
    })
  }

  const selectedUnitDetail = localUnits.find((u) => u.id === unitId)

  // Time validation
  const totalTime = localUnits.reduce((sum, u) => sum + (u.time ?? 0), 0)
  // lessonTime may not be on the type yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lessonTime = (lesson as any).lessonTime ?? 0
  const hasTimeMismatch = lessonTime > 0 && totalTime !== lessonTime

  return (
    <div className="flex h-full flex-1 overflow-hidden">
      {/* ---------------- CENTER PANE ---------------- */}
      <div className={`flex-1 flex flex-col min-w-0 bg-background ${unitId ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold text-primary tracking-tight uppercase">Lesson Plan</h2>
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <span className="font-medium text-foreground">Lesson {lesson.lesson}</span>
              <span className="mx-2 text-border">•</span>
              <span>{lesson.subject}</span>
              <Badge variant="secondary" className="ml-3 text-xs gap-1">
                <Clock className="h-3 w-3" />
                {lessonTime} min
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() =>
                window.open(`/lets-learn/${lessonId}?preview=true&source=lessonPlan`, '_blank')
              }
            >
              <Eye className="h-4 w-4" /> Preview
            </Button>
            {canCreateUnit && (
              <Button size="sm" className="h-8 shadow-sm gap-1.5" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Add Unit
              </Button>
            )}
          </div>
        </div>

        {/* Time mismatch alert */}
        {hasTimeMismatch && !isLoading && (
          <Alert variant="destructive" className="mx-6 mt-4 py-2 border-destructive/20 bg-destructive/5 rounded-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-xs font-semibold">Time mismatch</AlertTitle>
            <AlertDescription className="text-xs">
              Total unit time <strong>{totalTime} min</strong> does not match lesson time{' '}
              <strong>{lessonTime} min</strong>.
            </AlertDescription>
          </Alert>
        )}

        {/* Search Bar & Select All (Matches mockup) */}
        <div className={`px-6 py-3 border-b border-border shrink-0 flex items-center gap-4 ${hasTimeMismatch ? 'border-t mt-4' : ''}`}>
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={isAllSelected}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer accent-primary"
            />
            <span className="text-sm font-medium text-foreground whitespace-nowrap">Select All</span>
          </div>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search units..."
              className="w-full pl-9 pr-4 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring bg-muted/20"
            />
          </div>
        </div>

        {/* Unit List */}
        <div className="flex-1 overflow-y-auto p-6 bg-muted/30">
          <div className="space-y-4 max-w-4xl mx-auto">
            {isError ? <p role="alert">Unable to load unit plans.</p> : isLoading ? (
              <LoadingSkeleton />
            ) : localUnits.length === 0 ? (
              <EmptyUnitState lessonId={lessonId} onCopied={() => {}} />
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={localUnits.map((u) => u.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-4">
                    {localUnits.map((unit) => (
                      <SortableUnitCard
                        key={unit.id}
                        unit={unit}
                        isSelected={unitId === unit.id}
                        isChecked={selectedUnitIds.has(unit.id)}
                        canReorder={canUpdateUnit}
                        onClick={() => setUnitId(unitId === unit.id ? null : unit.id)}
                        onCheck={(checked) => handleCheckUnit(unit.id, checked)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>

      {/* ---------------- RIGHT PANE ---------------- */}
      {selectedUnitDetail && (
        <UnitDetailPane
          unit={selectedUnitDetail}
          onClose={() => setUnitId(null)}
          onEdit={() => setUnitToEdit(selectedUnitDetail)}
          onDelete={() => setUnitToDelete(selectedUnitDetail)}
        />
      )}

      {/* Dialogs */}
      <UnitUpsertDialog
        open={createOpen || !!unitToEdit}
        unit={unitToEdit}
        lessonId={lessonId}
        onClose={() => { setCreateOpen(false); setUnitToEdit(null) }}
      />
      <CategoryDialog
        open={!!categoryUnit}
        unit={categoryUnit}
        lessonId={lessonId}
        onClose={() => setCategoryUnit(null)}
      />

      <AlertDialog open={!!unitToDelete} onOpenChange={(o) => (!o && setUnitToDelete(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove unit?</AlertDialogTitle>
            <AlertDialogDescription>
              Unit <strong>{unitToDelete?.procedures}</strong> will be soft-deleted. Sort order will be updated automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={executeDelete}
            >
              {isDeleting ? "Deleting..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 rounded-xl border bg-card">
          <Skeleton className="h-4 w-4 mt-1 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
