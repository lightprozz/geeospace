'use client'
// ---------------------------------------------------------------------------
// _components/exam-frame-client.tsx
// Main controller — manages local ExamResultForm[] state
// All edits are local until "Save All Templates" PUT
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { useRouter } from '@/features/lms/port-support'
import { Plus, Save, ChevronLeft, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PanelHeader } from '@/features/lms/port-support'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
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
import { Loader2 } from 'lucide-react'
import { useExamForms, useSaveExamForms } from '@/features/lms/hooks/curriculum/use-exam-forms'
import { usePermission } from '@/features/lms/port-support'
import { ExamTemplateCard } from './exam-template-card'
import { DEFAULT_EXAM_FORM } from '@/features/lms/types/curriculum'
import type { LevelDetail, ExamFormItemRequest } from '@/features/lms/types/curriculum'

interface ExamFrameClientProps {
  level: LevelDetail
  levelId: string
}

export function ExamFrameClient({ level, levelId }: ExamFrameClientProps) {
  const router = useRouter()
  const { can } = usePermission()
  const canUpdateExamFrame = can('curriculum.update')
  const { data: serverForms = [] } = useExamForms(levelId)
  const { mutate: saveForms, isPending: isSaving } = useSaveExamForms(levelId)

  // Local editing state — detached from server until Save All
  const [localForms, setLocalForms] = useState<ExamFormItemRequest[]>(serverForms)
  const [confirmSaveEmpty, setConfirmSaveEmpty] = useState(false)

  function handleAdd() {
    const newType = localForms.length + 1
    const examName = `Exam ${newType}`
    const newForm: ExamFormItemRequest = {
      id: crypto.randomUUID(),   // temp ID — replaced by DB after save
      examType: newType,
      examName,
      examFormJson: JSON.stringify({
        ...DEFAULT_EXAM_FORM,
        examType: newType,
        examName,
      }),
    }
    setLocalForms((prev) => [...prev, newForm])
  }

  function handleChange(updated: ExamFormItemRequest) {
    setLocalForms((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
  }

  function handleDelete(id: string) {
    setLocalForms((prev) => prev.filter((f) => f.id !== id))
  }

  function handleSaveAll() {
    if (localForms.length === 0) {
      setConfirmSaveEmpty(true)
      return
    }
    // Re-number examType sequentially (in case templates were deleted/reordered)
    const renumbered = localForms.map((f, i) => ({
      ...f,
      examType: i + 1,
    }))
    saveForms(renumbered)
  }

  // ── Inject breadcrumb + actions into shared header ──────────────
  const panelHeader = <PanelHeader config={{
    breadcrumbs: (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#lms-curriculum" className="text-xs">
              Curriculum
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span className="text-xs text-muted-foreground">{level.name}</span>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-xs font-medium">Exam Score Frame</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    ),
    actions: (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs gap-1"
        onClick={() => router.back()}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back
      </Button>
    ),
  }} />


  return (
    <div className="flex h-full flex-col">
      {panelHeader}
      {/* ── Sub-header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b bg-card">
        <div>
          <h1 className="text-sm font-semibold">
            Exam Score Frame — {level.name}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure exam templates for this study level ·{' '}
            {localForms.length} template{localForms.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canUpdateExamFrame && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={handleAdd}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Template
          </Button>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        {localForms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4 text-center">
            <div className="rounded-full bg-muted p-5">
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm">No exam templates yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add an exam template to configure the score frame for {level.name}.
              </p>
            </div>
            {canUpdateExamFrame && (
              <Button size="sm" onClick={handleAdd}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add Exam Template
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl">
            {localForms.map((form, i) => (
              <ExamTemplateCard
                key={form.id}
                form={form}
                index={i}
                onChange={handleChange}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Sticky footer ───────────────────────────────────────────── */}
      {localForms.length > 0 && canUpdateExamFrame && (
        <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Changes are local — click Save to persist all templates.
          </p>
          <Button size="sm" onClick={handleSaveAll} disabled={isSaving}>
            {isSaving
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Save className="mr-2 h-4 w-4" />
            }
            Save All Templates
          </Button>
        </div>
      )}

      {/* Confirm saving empty array (clears all templates) */}
      <AlertDialog
        open={confirmSaveEmpty}
        onOpenChange={(o) => !o && setConfirmSaveEmpty(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all exam templates?</AlertDialogTitle>
            <AlertDialogDescription>
              Saving with no templates will remove ALL exam configurations for{' '}
              <strong>{level.name}</strong>. This cannot be undone without re-adding them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setConfirmSaveEmpty(false)
                saveForms([])
              }}
            >
              Clear & Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
