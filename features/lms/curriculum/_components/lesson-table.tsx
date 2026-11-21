'use client'
// ---------------------------------------------------------------------------
// _components/lesson-table.tsx
// Right panel — table of lesson plans for selected study level
// Manages: selection state, bulk actions, worksheet upload trigger
// ---------------------------------------------------------------------------

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from '@/features/lms/port-support'
import { Plus, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
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
import { useLessonsByLevel } from '@/features/lms/hooks/curriculum/use-lesson-plans'
import { useDeleteLessonPlan, useBulkDeleteLessonPlans, useUploadWorksheet } from '@/features/lms/hooks/curriculum/use-lesson-plans'
import { useCurriculumStore } from '@/features/lms/stores/use-curriculum-store'
import { usePermission } from '@/features/lms/port-support'
import { LessonRow } from './lesson-row'
import { EmptyLessonState } from './empty-lesson-state'
import type { LevelListItem, LessonListItem } from '@/features/lms/types/curriculum'

interface LessonTableProps {
  level: LevelListItem
}

export function LessonTable({ level }: LessonTableProps) {
  const { can } = usePermission()
  const canCreateLesson = can('curriculum.create')
  const canDeleteLesson = can('curriculum.delete')

  const { data: lessons = [], isLoading } = useLessonsByLevel(level.id)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [worksheetLessonId, setWorksheetLessonId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const openCreateLesson = useCurriculumStore((s) => s.openCreateLesson)
  const openEditLesson = useCurriculumStore((s) => s.openEditLesson)
  const { mutate: deleteSingle } = useDeleteLessonPlan(level.id)
  const { mutate: bulkDelete, isPending: isBulkDeleting } = useBulkDeleteLessonPlans(level.id)
  const { mutate: uploadWs } = useUploadWorksheet(worksheetLessonId ?? '')

  // ── Reset selection when switching levels ──────────────────────────
  // React reuses this component instance (same position in tree), so
  // useState does NOT auto-reset. Clear explicitly on level change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIds(new Set())
  }, [level.id])

  const allChecked = lessons.length > 0 && selectedIds.size === lessons.length
  const someChecked = selectedIds.size > 0 && !allChecked

  // ── Stable callbacks for React.memo LessonRow ─────────────────
  const router = useRouter()
  const handleNavigate = useCallback((path: string) => router.push(path), [router])
  const handleCheck = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }, [])
  const handleEdit = useCallback((l: LessonListItem) => openEditLesson(l), [openEditLesson])
  const handleDelete = useCallback((id: string) => setDeleteTarget(id), [])
  const handleUploadWorksheet = useCallback((lessonId: string) => {
    setWorksheetLessonId(lessonId)
    fileInputRef.current?.click()
  }, [])

  function handleBulkDelete() {
    bulkDelete([...selectedIds], { onSuccess: () => setSelectedIds(new Set()) })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file && worksheetLessonId) {
      uploadWs(file)
    }
    e.target.value = '' // reset so same file can be re-selected
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Table Header ── */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{level.name}</span>
          <Separator orientation="vertical" className="h-4" />
          <span className="text-xs text-muted-foreground">
            {isLoading ? '…' : `${lessons.length} / ${level.numberOfLesson} lessons`}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {canDeleteLesson && selectedIds.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10"
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete ({selectedIds.size})
            </Button>
          )}
          {canCreateLesson && (
            <Button size="sm" className="h-7 text-xs" onClick={openCreateLesson}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Lesson
            </Button>
          )}
        </div>
      </div>

      {/* ── Hidden file input for worksheet upload ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Table body ── */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <LoadingSkeleton />
        ) : lessons.length === 0 ? (
          <EmptyLessonState levelName={level.name} />
        ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 pr-0">
                  <Checkbox
                    checked={allChecked}
                    ref={(el) => {
                      if (el) (el as HTMLButtonElement).dataset.indeterminate = someChecked ? 'true' : 'false'
                    }}
                    onCheckedChange={(checked) =>
                      setSelectedIds(checked ? new Set(lessons.map((l) => l.id)) : new Set())
                    }
                    aria-label="Select all lessons"
                  />
                </TableHead>
                <TableHead className="w-36">Level</TableHead>
                <TableHead className="w-20 text-center">Lesson #</TableHead>
                <TableHead className="max-w-[180px]">Subject</TableHead>
                <TableHead className="max-w-[200px]">Content</TableHead>
                <TableHead className="w-20 text-center">TB</TableHead>
                <TableHead className="w-16 text-center">WS</TableHead>
                <TableHead className="w-36">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lessons.map((lesson) => (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  isChecked={selectedIds.has(lesson.id)}
                  onCheck={handleCheck}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onUploadWorksheet={handleUploadWorksheet}
                  onNavigate={handleNavigate}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Delete confirm dialog ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive lesson plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This lesson plan will be soft-deleted and moved to the archived list. It can be
              accessed when copying to other lessons.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteSingle(deleteTarget)
                  setDeleteTarget(null)
                }
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-10" />
          <TableHead>Level</TableHead>
          <TableHead>Lesson #</TableHead>
          <TableHead>Subject</TableHead>
          <TableHead>Content</TableHead>
          <TableHead>TB</TableHead>
          <TableHead>WS</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-4" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-6 mx-auto" /></TableCell>
            <TableCell><Skeleton className="h-4 w-6 mx-auto" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
