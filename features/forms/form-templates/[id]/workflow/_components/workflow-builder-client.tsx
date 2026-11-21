'use client'
// ---------------------------------------------------------------------------
// workflow-builder-client.tsx
// Workflow page shell. The canvas owns the full viewport; the step editor
// slides over it as a right-hand drawer (matching the mockup) instead of
// squeezing the canvas the way a static third column does. Selecting a node
// opens the drawer; clicking the canvas or closing it dismisses the selection.
//
// M7 (D3): the turnaround SLA belongs to the template, so it is shown once in
// the dashboard header instead of on every step card.
//
// M8: the drawer backdrop starts after the floating step navigator, so the
// navigator stays visible and clickable while the drawer is open. Clicking
// another step switches the drawer to that step.
// ---------------------------------------------------------------------------

import { useMemo, useState } from 'react'
import { WorkflowDiagramCanvas } from './workflow-diagram-canvas'
import { WorkflowStepList } from './workflow-step-list'
import { WorkflowStepEditor } from './workflow-step-editor'
import { useTemplate } from '@/features/forms/form-templates/hooks/use-template'
import { useProcessesQuery } from '../hooks/use-processes'
import { useSetDashboardHeader } from '@/features/forms/window-adapter'
import { FormTemplateBreadcrumb } from '@/features/forms/form-templates/_components/form-template-breadcrumb'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle, X } from 'lucide-react'
import { NODE_THEMES, themeKeyForStepType } from './nodes/node-themes'

/** Width of the floating step navigator; the drawer/backdrop avoid it. */
const STEP_LIST_WIDTH = 240

interface WorkflowBuilderClientProps {
  templateId: string
}

export function WorkflowBuilderClient({ templateId }: WorkflowBuilderClientProps) {
  const { data: template, isLoading: templateLoading } = useTemplate(templateId)
  const { data: steps } = useProcessesQuery(templateId)
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  // undefined = closed; null = create mode; a step id = edit that step.
  const [editorStepId, setEditorStepId] = useState<string | null | undefined>(undefined)

  const slaHours = template?.expirationCycle ?? null

  useSetDashboardHeader({
    breadcrumbs: (
      <FormTemplateBreadcrumb
        id={templateId}
        templateName={template?.name}
        mode="process"
      />
    ),
    // M7 (D3): the template turnaround window, shown once for the whole flow.
    actions: template ? (
      <span className="inline-flex items-center rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:bg-sky-950 dark:text-sky-300">
        SLA: {slaHours ?? '—'} giờ
      </span>
    ) : null,
  }, template?.id)

  // The drawer header is tinted with the step-type accent, so the drawer
  // matches the node the user picked.
  const editorAccent = useMemo(() => {
    if (!editorStepId) return NODE_THEMES.approval.accent
    const step = steps?.find((s) => s.id === editorStepId)
    if (!step) return NODE_THEMES.approval.accent
    return NODE_THEMES[themeKeyForStepType(step.typeApprovalId)].accent
  }, [editorStepId, steps])

  const openEditor = (stepId: string | null) => {
    setSelectedStepId(stepId)
    setEditorStepId(stepId)
  }

  const closeEditor = () => {
    setSelectedStepId(null)
    setEditorStepId(undefined)
  }

  if (templateLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-muted-foreground">Đang tải…</span>
      </div>
    )
  }

  if (!template) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="size-4" />
        <AlertTitle>Không tìm thấy biểu mẫu</AlertTitle>
        <AlertDescription>
          Biểu mẫu không tồn tại hoặc bạn không có quyền truy cập.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="relative h-[calc(100vh-8rem)] overflow-hidden rounded-lg border">
      {/* Canvas fills the page; the list is a slim navigator that stays put. */}
      <WorkflowDiagramCanvas
        templateId={templateId}
        selectedStepId={selectedStepId}
        onStepSelect={(id) => (id ? openEditor(id) : closeEditor())}
      />

      {/* Slide-over configuration drawer */}
      <aside
        className={`absolute inset-y-0 right-0 z-50 flex w-[420px] max-w-full flex-col border-l bg-background shadow-2xl transition-transform duration-300 ease-in-out ${
          editorStepId === undefined ? 'translate-x-full' : 'translate-x-0'
        }`}
        inert={editorStepId === undefined}
      >
        <div
          className="flex items-center justify-between border-b px-4 py-3"
          style={{ borderLeft: `4px solid ${editorAccent}` }}
        >
          <h3 className="text-sm font-semibold">
            {editorStepId === null ? 'Thêm bước' : 'Cấu hình bước'}
          </h3>
          <button
            type="button"
            onClick={closeEditor}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Đóng bảng cấu hình"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <WorkflowStepEditor
            templateId={templateId}
            stepId={editorStepId === undefined ? selectedStepId : editorStepId}
            onClose={closeEditor}
          />
        </div>
      </aside>

      {/* M8: the backdrop starts after the step navigator, so the navigator
          stays visible and clickable while the drawer is open. */}
      {editorStepId !== undefined ? (
        <button
          type="button"
          aria-label="Đóng bảng cấu hình"
          onClick={closeEditor}
          className="absolute inset-y-0 left-60 right-0 z-30 cursor-default bg-foreground/5"
        />
      ) : null}

      {/* Step navigator floats over the canvas so the flow keeps full width. */}
      <div
        className="absolute left-4 top-4 z-40 flex h-[calc(100%-2rem)] w-56 flex-col overflow-hidden rounded-lg border bg-background/95 shadow-lg backdrop-blur"
        style={{ width: STEP_LIST_WIDTH - 32 }}
      >
        <WorkflowStepList
          templateId={templateId}
          selectedStepId={selectedStepId}
          onStepSelect={(id) => openEditor(id)}
          onAddStep={() => {
            setSelectedStepId(null)
            setEditorStepId(null)
          }}
        />
      </div>
    </div>
  )
}
