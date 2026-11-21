'use client'
// ---------------------------------------------------------------------------
// _components/triggers-page-client.tsx
// Trigger list for one workflow step.
//
// The header (breadcrumb + title) is injected into the shared dashboard
// header so the page body only owns the trigger list, matching the rest of
// the form-template module.
// ---------------------------------------------------------------------------

import { useMemo, useState } from 'react'
import { Lock, Plus, Wifi } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { usePermissionStore } from '@/stores/use-permission-store'
import { PERMISSIONS } from '@/lib/permissions'
import { useSetDashboardHeader } from '@/features/forms/window-adapter'
import { FormTemplateBreadcrumb } from '@/features/forms/form-templates/_components/form-template-breadcrumb'
import { useTemplate } from '@/features/forms/form-templates/hooks/use-template'
import { toast } from 'sonner'
import type { TriggerDto, CreateTriggerRequest, TestFireRequest } from '../types/trigger'
import { TriggerCard } from './trigger-card'
import { TriggerFormDrawer } from './trigger-form-drawer'
import { TriggerTestFireDialog } from './trigger-test-fire-dialog'
import { useTriggersQuery } from '../hooks/use-triggers'
import {
  useCreateTriggerMutation,
  useUpdateTriggerMutation,
  useDeleteTriggerMutation,
} from '../hooks/use-trigger-mutations'
import { useTestFireMutation } from '../hooks/use-test-fire'
import type { TriggerTestFireResultDto } from '../types/trigger'

interface TriggersPageClientProps {
  templateId: string
  processId: string
}

export function TriggersPageClient({ templateId, processId }: TriggersPageClientProps) {
  const { data: triggers = [], isLoading } = useTriggersQuery(processId)
  const { data: template } = useTemplate(templateId)

  // The template's field keys feed the payload chips and the condition
  // builder, so the author never has to type a key by hand.
  const inputKeys = useMemo(
    () =>
      (template?.fields ?? []).map((field) => ({
        key: field.inputKey,
        value: field.label,
      })),
    [template?.fields],
  )

  // Drive mutation controls from the highest-tier claim (admin). Write-only
  // users can read this page (gated by route-permissions.ts) but cannot
  // mutate — UI hides the affordance to prevent 403s on click. The
  // TriggersController guards every write action with FormsTemplateAdmin, so
  // Edit / Test fire / Delete / Add are all admin-only.
  const canManage = usePermissionStore((s) =>
    s.has(PERMISSIONS.FORMS_TEMPLATE_ADMIN)
  )
  // Block on permission hydration to avoid a banner flash from "Read-only"
  // → "Manage" on first paint when GEEO.USERINFO cookie isn't yet parsed
  // by AuthInitializer.
  const isHydrated = usePermissionStore((s) => s.isLoaded)

  const createMutation = useCreateTriggerMutation(processId)
  const updateMutation = useUpdateTriggerMutation(processId)
  const deleteMutation = useDeleteTriggerMutation(processId)
  const testFireMutation = useTestFireMutation(processId)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingTrigger, setEditingTrigger] = useState<TriggerDto | null>(null)
  const [testFireOpen, setTestFireOpen] = useState(false)
  const [testFireTrigger, setTestFireTrigger] = useState<TriggerDto | null>(null)
  const [testFireResult, setTestFireResult] = useState<TriggerTestFireResultDto | null>(null)

  useSetDashboardHeader({
    breadcrumbs: (
      <FormTemplateBreadcrumb
        id={templateId}
        templateName={template?.name}
        mode="process"
      />
    ),
    actions: (
      <span className="text-sm font-medium text-muted-foreground">Trigger</span>
    ),
  }, template?.id)

  const handleSave = async (body: CreateTriggerRequest) => {
    if (editingTrigger) {
      await updateMutation.mutateAsync({ triggerId: editingTrigger.id, body })
    } else {
      await createMutation.mutateAsync(body)
    }
  }

  const handleDelete = async (triggerId: string) => {
    if (!confirm('Xoá trigger này?')) return
    try {
      await deleteMutation.mutateAsync(triggerId)
      toast.success('Đã xoá trigger')
    } catch {
      toast.error('Xoá trigger thất bại')
    }
  }

  const handleTestFire = (trigger: TriggerDto) => {
    setTestFireTrigger(trigger)
    setTestFireResult(null)
    setTestFireOpen(true)
  }

  const handleFire = async (sandboxJson: string) => {
    if (!testFireTrigger) return
    try {
      const sandboxAnswers = JSON.parse(sandboxJson)
      const body: TestFireRequest = { sandboxAnswers }
      const result = await testFireMutation.mutateAsync({
        triggerId: testFireTrigger.id,
        body,
      })
      setTestFireResult(result)
    } catch {
      toast.error('Chạy thử trigger thất bại')
    }
  }

  const handleEdit = (trigger: TriggerDto) => {
    setEditingTrigger(trigger)
    setDrawerOpen(true)
  }

  const handleAddNew = () => {
    setEditingTrigger(null)
    setDrawerOpen(true)
  }

  const handleDrawerClose = () => {
    setDrawerOpen(false)
    setEditingTrigger(null)
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  // Permission hydration gate — kept below every hook so the hook order is
  // stable across renders.
  if (!isHydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wifi className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Trigger</h2>
        </div>
        {canManage && (
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm trigger
          </Button>
        )}
      </div>

      {!canManage && (
        <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800">
          <Lock className="h-4 w-4" />
          <AlertTitle>Chỉ xem</AlertTitle>
          <AlertDescription>
            Chỉ người dùng có vai trò Admin mới tạo, sửa hoặc test-fire
            trigger. Liên hệ quản trị viên nếu bạn cần quyền này.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : triggers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Chưa có trigger nào.{' '}
            {canManage
              ? 'Thêm một trigger để gọi webhook HTTP khi có sự kiện của bước xử lý.'
              : 'Quản trị viên chưa cấu hình trigger cho bước này.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {triggers.map((trigger) => (
            <TriggerCard
              key={trigger.id}
              {...trigger}
              canManage={canManage}
              onEdit={() => handleEdit(trigger)}
              onDelete={canManage ? () => handleDelete(trigger.id) : undefined}
              onTestFire={
                canManage ? () => handleTestFire(trigger) : undefined
              }
            />
          ))}
        </div>
      )}

      {canManage && (
        <>
          <TriggerFormDrawer
            open={drawerOpen}
            onClose={handleDrawerClose}
            existingTrigger={editingTrigger}
            onSave={handleSave}
            isLoading={isSaving}
            inputKeys={inputKeys}
            templateId={templateId}
          />

          <TriggerTestFireDialog
            open={testFireOpen}
            onClose={() => setTestFireOpen(false)}
            onFire={handleFire}
            result={testFireResult}
            isLoading={testFireMutation.isPending}
          />
        </>
      )}
    </div>
  )
}
