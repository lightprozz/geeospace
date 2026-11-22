'use client'
// ---------------------------------------------------------------------------
// workflow-step-editor.tsx
// The step drawer: name, approval type, description, approvers, worklog
// attachment, and the deny-branch target.
//
// W-H2/W-H3: the deny-branch select writes through `useDenyBranchMutation`, a
// dedicated endpoint, rather than folding the change into the step PUT. The
// step PUT itself still carries the description and the approvers.
// ---------------------------------------------------------------------------

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from '@/features/forms/window-adapter'
import type { ProcessStepDto, CreateProcessRequest, ApproverRef } from '../types/workflow'
import { TYPE_APPROVAL_ID, TYPE_APPROVAL_LABEL } from '../types/workflow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { Loader2, Trash2, Zap } from 'lucide-react'
import { useProcessesQuery } from '../hooks/use-processes'
import {
  useCreateProcessMutation,
  useUpdateProcessMutation,
  useDeleteProcessMutation,
  useDenyBranchMutation,
} from '../hooks/use-process-mutations'
import { usePublishedWorkLogTemplatesQuery } from '../../../worklog-templates/_components/use-worklog-templates'
import { usePermissionStore } from '@/stores/use-permission-store'
import { PERMISSIONS } from '@/lib/permissions'
import { wouldCreateCycle } from '../lib/graph-utils'
import { ApproverPicker } from './approver-picker'
import { ApiConfigSection } from '../[stepId]/triggers/_components/api-config-section'

interface WorkflowStepEditorProps {
  templateId: string
  stepId: string | null
  onClose: () => void
}

function emptyForm(): CreateProcessRequest {
  return {
    processName: '',
    typeApprovalId: TYPE_APPROVAL_ID.User,
    description: '',
    approvers: [] as ApproverRef[],
    worklogTemplateId: undefined,
    nextProcessIfDeniedId: undefined,
  }
}

function stepToForm(step: ProcessStepDto): CreateProcessRequest {
  return {
    processName: step.processName,
    typeApprovalId: step.typeApprovalId,
    description: step.description ?? '',
    approvers: step.approvers.map((a) => ({
      kind: a.kind,
      resourceId: a.resourceId,
    })),
    worklogTemplateId: step.worklogTemplateId,
    nextProcessIfDeniedId: step.nextProcessIfDeniedId,
  }
}

export function WorkflowStepEditor({
  templateId,
  stepId,
  onClose,
}: WorkflowStepEditorProps) {
  const { data: steps, isError: stepsError } = useProcessesQuery(templateId)
  // M1: the shared worklog-templates hook. Only published templates are
  // listed, because attaching an unpublished one is rejected by the BE.
  const { data: worklogTemplates } = usePublishedWorkLogTemplatesQuery()
  const router = useRouter()

  // FG4: API configs are guarded by FormsTemplateAdmin on the BE, so the
  // write affordances follow the same claim.
  const canManage = usePermissionStore((s) =>
    s.has(PERMISSIONS.FORMS_TEMPLATE_ADMIN),
  )

  const step = steps?.find((s) => s.id === stepId)
  const isNew = !stepId

  const createMutation = useCreateProcessMutation(templateId)
  const updateMutation = useUpdateProcessMutation(templateId)
  const deleteMutation = useDeleteProcessMutation(templateId)
  const denyBranchMutation = useDenyBranchMutation(templateId)

  const [form, setForm] = useState<CreateProcessRequest>(emptyForm())
  const [syncedStep, setSyncedStep] = useState<ProcessStepDto | undefined>(undefined)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  // Load the selected step into the form. Adjusting state during render —
  // rather than in an effect — keeps the form in sync with the step the user
  // picked without an extra render pass with stale values.
  if (step !== syncedStep) {
    setSyncedStep(step)
    setForm(step ? stepToForm(step) : emptyForm())
  }

  const orderedSteps = useMemo(
    () =>
      [...(steps ?? [])].sort(
        (a: ProcessStepDto, b: ProcessStepDto) =>
          (a.processOrder ?? 0) - (b.processOrder ?? 0),
      ),
    [steps],
  )

  // D2: a deny branch may point backwards, so only deny edges are checked for
  // cycles. The forward chain is layout information, not a routing edge.
  const denyTargets = useMemo(
    () =>
      orderedSteps.filter((s) => {
        if (s.id === stepId) return false
        if (!stepId) return true
        // Reject a target that would close a deny cycle once this step's own
        // pending deny edge is taken into account.
        const denyEdges = orderedSteps
          .filter((x) => x.id !== stepId && x.nextProcessIfDeniedId)
          .map((x) => ({
            id: `deny-${x.id}`,
            source: x.id,
            target: x.nextProcessIfDeniedId as string,
            data: { kind: 'deny' },
          }))
        const fakeNodes = orderedSteps.map((s) => ({
          id: s.id,
          type: 'approval-step-node',
          position: { x: 0, y: 0 },
          data: { step: s },
        }))
        return !wouldCreateCycle(fakeNodes, denyEdges, stepId, s.id)
      }),
    [orderedSteps, stepId],
  )

  const handleSave = useCallback(async () => {
    if (!form.processName.trim()) return
    if (isNew) {
      await createMutation.mutateAsync(form)
    } else if (step) {
      await updateMutation.mutateAsync({ processId: step.id, request: form })
    }
    onClose()
  }, [form, isNew, step, createMutation, updateMutation, onClose])

  const handleDelete = useCallback(async () => {
    if (!step) return
    await deleteMutation.mutateAsync(step.id)
    setConfirmDeleteOpen(false)
    onClose()
  }, [step, deleteMutation, onClose])

  // W-H2/W-H3: the deny branch is written on its own, so changing it never
  // disturbs the description, the approvers, or the worklog attachment.
  const handleDenyBranchChange = useCallback(
    (targetId: string | undefined) => {
      if (!step) return
      denyBranchMutation.mutate({
        processId: step.id,
        request: { nextProcessIfDeniedId: targetId },
      })
    },
    [step, denyBranchMutation],
  )

  const isBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    denyBranchMutation.isPending

  return (
    // The drawer chrome (title, accent border, close button) is owned by
    // workflow-builder-client.tsx, so this component only renders the form.
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {stepsError ? (
            <p className="text-xs text-destructive">
              Không tải được danh sách bước. Bạn có thể vẫn tạo bước mới.
            </p>
          ) : null}
          {/* Step name */}
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="step-name">
              Tên bước
            </Label>
            <Input
              id="step-name"
              className="h-7 text-xs"
              placeholder="Ví dụ: Trưởng phòng phê duyệt"
              value={form.processName}
              onChange={(e) =>
                setForm((prev: CreateProcessRequest) => ({
                  ...prev,
                  processName: e.target.value,
                }))
              }
            />
          </div>

          {/* Approver type */}
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="step-type">
              Loại người duyệt
            </Label>
            <Select
              value={String(form.typeApprovalId)}
              onValueChange={(v: string) =>
                setForm((prev: CreateProcessRequest) => ({
                  ...prev,
                  typeApprovalId: Number(v),
                  // The picked approvers belong to the previous type; they are
                  // not valid for the new one.
                  approvers: [],
                }))
              }
            >
              <SelectTrigger id="step-type" className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_APPROVAL_ID).map(([name, val]) => (
                  <SelectItem key={val} value={String(val)}>
                    {TYPE_APPROVAL_LABEL[val as number] ?? name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="step-desc">
              Mô tả
            </Label>
            <Input
              id="step-desc"
              className="h-7 text-xs"
              placeholder="Mô tả tuỳ chọn"
              value={form.description ?? ''}
              onChange={(e) =>
                setForm((prev: CreateProcessRequest) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />
          </div>

          <Separator />

          {/* WorkLog attachment — only published templates can be attached. */}
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="step-worklog">
              Mẫu worklog
            </Label>
            <Select
              value={form.worklogTemplateId ?? 'none'}
              onValueChange={(v: string) =>
                setForm((prev: CreateProcessRequest) => ({
                  ...prev,
                  worklogTemplateId: v === 'none' ? undefined : v,
                }))
              }
            >
              <SelectTrigger id="step-worklog" className="h-7 text-xs">
                <SelectValue placeholder="Chọn mẫu worklog…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Không dùng</SelectItem>
                {(worklogTemplates ?? []).map((wl) => (
                  <SelectItem key={wl.id} value={wl.id}>
                    {wl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Approvers */}
          <div className="space-y-1">
            <Label className="text-xs">Người duyệt</Label>
            <ApproverPicker
              typeApprovalId={form.typeApprovalId}
              value={form.approvers}
              onChange={(approvers) =>
                setForm((prev: CreateProcessRequest) => ({ ...prev, approvers }))
              }
            />
            {form.approvers.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">
                Chưa chọn người duyệt — bước này sẽ không thể duyệt.
              </p>
            ) : null}
          </div>

          <Separator />

          {/* FG4: per-process API configs. They attach to a saved step, so
          the section only shows once the step has an id. */}
          {!isNew && step ? (
            <>
              <ApiConfigSection processId={step.id} canManage={canManage} />
              <Separator />
            </>
          ) : null}

          {/* Deny-branch target — written through its own endpoint. */}
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="deny-branch">
              Nhánh khi từ chối
            </Label>
            {isNew ? (
              <>
                <Select
                  value={form.nextProcessIfDeniedId ?? 'none'}
                  onValueChange={(v: string) =>
                    setForm((prev: CreateProcessRequest) => ({
                      ...prev,
                      nextProcessIfDeniedId: v === 'none' ? undefined : v,
                    }))
                  }
                  disabled
                >
                  <SelectTrigger id="deny-branch" className="h-7 text-xs">
                    <SelectValue placeholder="Hãy lưu bước trước" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      Không có (dừng luồng khi từ chối)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Lưu bước trước rồi chọn nhánh từ chối.
                </p>
              </>
            ) : (
              <Select
                value={step?.nextProcessIfDeniedId ?? 'none'}
                onValueChange={(v: string) =>
                  handleDenyBranchChange(v === 'none' ? undefined : v)
                }
              >
                <SelectTrigger id="deny-branch" className="h-7 text-xs">
                  <SelectValue placeholder="Không có nhánh từ chối (dừng luồng)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    Không có (dừng luồng khi từ chối)
                  </SelectItem>
                  {denyTargets.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.processName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="flex items-center gap-2 px-3 py-2 border-t shrink-0">
        {!isNew && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                router.push(
                  `/form-templates/${templateId}/workflow/${stepId}/triggers`,
                )
              }}
            >
              <Zap className="size-3 mr-1" />
              Triggers
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={isBusy}
            >
              <Trash2 className="size-3 mr-1" />
              Xoá
            </Button>
          </>
        )}
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={onClose} disabled={isBusy}>
          Huỷ
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isBusy || !form.processName.trim()}
        >
          {isBusy ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
          {isNew ? 'Thêm bước' : 'Lưu'}
        </Button>
      </div>

      {/* M2: a step can be a deny-branch target for another step, so the
      deletion is confirmed before it goes through. */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá bước này?</AlertDialogTitle>
            <AlertDialogDescription>
              Bước “{step?.processName}” sẽ bị xoá khỏi workflow. Nếu một bước
              khác đang trỏ tới bước này bằng nhánh từ chối, việc xoá sẽ bị
              từ chối.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Keep the dialog open while the delete runs, so a rejected
                // delete (a deny-branch reference) does not look like a
                // successful removal.
                e.preventDefault()
                void handleDelete()
              }}
            >
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
