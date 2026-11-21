'use client'
// ---------------------------------------------------------------------------
// _components/form-template-detail-client.tsx
// Read-only view of a template. Shares the builder's three-column shell with
// the editor so the two modes line up visually; the settings rail and canvas
// render in a non-interactive state here.
// ---------------------------------------------------------------------------

import { useRouter } from '@/features/forms/window-adapter'
import { Edit, GitBranch, Power, PowerOff, Webhook } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useTemplate } from '../hooks/use-template'
import { useSetActive } from '../hooks/use-template-mutations'
import { useProcessesQuery } from '../[id]/workflow/hooks/use-processes'
import { useSetDashboardHeader } from '@/features/forms/window-adapter'
import { useCanWriteTemplates } from '@/lib/use-can'
import { FormTemplateBreadcrumb } from './form-template-breadcrumb'
import { FieldPreview } from './field-preview'
import { ThreeColumnBuilder } from './three-column-builder'
import {
  DEFAULT_SETTINGS,
  type FormSettingsValue,
  type SettingsChip,
} from './form-settings-rail'

interface FormTemplateDetailClientProps {
  id: string
}

export function FormTemplateDetailClient({ id }: FormTemplateDetailClientProps) {
  const router = useRouter()
  const canWrite = useCanWriteTemplates()
  const templateQuery = useTemplate(id)
  const toggleMutation = useSetActive(id)
  const processesQuery = useProcessesQuery(id)
  const template = templateQuery.data

  // The backend rejects activation when the template has no active workflow
  // step, so the button mirrors that rule instead of letting the request fail.
  // While the steps are still loading the rule is unknown, so the button stays
  // usable and the server stays the authority.
  const hasActiveSteps = (processesQuery.data ?? []).length > 0
  const activationBlocked =
    template?.deactivate === true &&
    !processesQuery.isLoading &&
    !hasActiveSteps

  useSetDashboardHeader({
    breadcrumbs: (
      <FormTemplateBreadcrumb
        id={id}
        templateName={template?.name ?? ''}
        mode="view"
      />
    ),
    actions: template ? (
      <span
        className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
          template.deactivate
            ? 'bg-amber-100 text-amber-700'
            : 'bg-emerald-100 text-emerald-700'
        }`}
      >
        {template.deactivate ? 'Draft' : 'Active'}
      </span>
    ) : null,
  }, template?.id)

  const handleToggle = async () => {
    if (!template) return
    try {
      // State is stated explicitly, not toggled — the server may hold a different
      // state than the last page load, and a toggle would flip whatever it finds.
      await toggleMutation.mutateAsync(!template.deactivate)
    } catch {
      // TanStack surfaces the error through the mutation state.
    }
  }

  if (templateQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-muted-foreground">Đang tải…</span>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-destructive">Không tìm thấy biểu mẫu</span>
      </div>
    )
  }

  const viewSettings: FormSettingsValue = {
    ...DEFAULT_SETTINGS,
    slaHours: template.expirationCycle ?? null,
    isActive: !template.deactivate,
    collectionId: template.collectionId ?? null,
    collectionName: template.collectionName ?? null,
    campuses: (template.campus ?? []).map(
      (c): SettingsChip => ({
        id: c.campusId,
        label: c.campusName || c.campusId,
      }),
    ),
    visibleTo: (template.groups ?? []).map(
      (g): SettingsChip => ({
        id: g.groupId,
        label: g.groupName || g.groupId,
      }),
    ),
    watchers: (template.watchers ?? []).map(
      (w): SettingsChip => ({
        id: w.userId,
        label: w.fullName || w.email || w.userId,
        hint: w.email ?? undefined,
      }),
    ),
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-end gap-2 border-b bg-background px-4 py-2">
        {canWrite ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggle}
                    disabled={
                      toggleMutation.isPending || activationBlocked
                    }
                  >
                    {template.deactivate ? (
                      <>
                        <Power className="mr-1 h-4 w-4" />
                        Kích hoạt
                      </>
                    ) : (
                      <>
                        <PowerOff className="mr-1 h-4 w-4" />
                        Vô hiệu hóa
                      </>
                    )}
                  </Button>
                </span>
              </TooltipTrigger>
              {activationBlocked ? (
                <TooltipContent>
                  Biểu mẫu cần ít nhất một bước quy trình đang hoạt động trước khi có
                  thể kích hoạt.
                </TooltipContent>
              ) : null}
            </Tooltip>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/form-templates/${id}/workflow`)}
            >
              <GitBranch className="mr-1 h-4 w-4" />
              Workflow
            </Button>
            <Button size="sm" onClick={() => router.push(`/form-templates/${id}/edit`)}>
              <Edit className="mr-1 h-4 w-4" />
              Chỉnh sửa
            </Button>
          </>
        ) : null}
        {/* Reading the API link only needs the read right, so the button stays
            visible to users who cannot edit the template. */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/form-templates/${id}/api`)}
        >
          <Webhook className="mr-1 h-4 w-4" />
          API
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        <ThreeColumnBuilder
          title={template.name}
          subtitle={template.description ?? undefined}
          onTitleChange={() => {}}
          onSubtitleChange={() => {}}
          fields={template.fields}
          onAddField={() => {}}
          onClearFields={() => {}}
          settings={viewSettings}
          onSettingsChange={() => {}}
          isSaving={toggleMutation.isPending}
          readOnly
        >
          {template.fields.length > 0 ? (
            <FieldPreview fields={template.fields} />
          ) : (
            <div className="px-8 py-12 text-center text-sm text-muted-foreground">
              Biểu mẫu này chưa có trường nào.
            </div>
          )}
        </ThreeColumnBuilder>
      </div>
    </div>
  )
}
