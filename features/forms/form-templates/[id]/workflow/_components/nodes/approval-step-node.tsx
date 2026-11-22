'use client'
// ---------------------------------------------------------------------------
// approval-step-node.tsx
// One approval step card, mirroring the mockup's node: a coloured accent
// bar, the step name, an assignment pill, and inline "Triggers & Actions"
// pills. The accent colour comes from the shared NODE_THEMES palette, keyed
// off the step's typeApprovalId.
//
// M4: the card shows the approver *type* (User / Role / Group (In-House) /
// Group (All)) next to the configured resource name, and a `+N` counter when
// the step resolves to more than one approver. Hovering the card previews the
// resolved users.
//
// M7: the per-step SLA badge is gone — the turnaround SLA belongs to the
// template and is shown once in the builder header.
// ---------------------------------------------------------------------------

import { memo, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { Node } from '@xyflow/react'
import {
  ChevronDown,
  CornerUpLeft,
  FileText,
  User,
  UserCheck,
  Users,
  UserRoundCog,
  UsersRound,
  Webhook,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NODE_THEMES, themeKeyForStepType } from './node-themes'
import { ApproverPreviewTooltip } from './approver-preview-tooltip'
import { TYPE_APPROVAL_LABEL } from '../../types/workflow'
import type { ProcessStepDto } from '../../types/workflow'

interface ApprovalStepNodeData extends Record<string, unknown> {
  step: ProcessStepDto
  /** Lookup so a reject jump can show the target step's name. */
  stepsById: Record<string, ProcessStepDto>
}

export type ApprovalStepNodeType = Node<ApprovalStepNodeData, 'approval-step-node'>

/** Icon per approval type, so the type is recognisable without reading the chip. */
const TYPE_ICONS = {
  1: User,
  2: UserCheck,
  3: UserRoundCog,
  4: UsersRound,
} as const

function ApprovalStepNodeComponent({
  data,
  selected,
}: NodeProps<ApprovalStepNodeType>) {
  const { step, stepsById } = data
  const theme = NODE_THEMES[themeKeyForStepType(step.typeApprovalId)]
  const [showActions, setShowActions] = useState(false)

  const approvers = step.approvers ?? []
  const primaryApprover = approvers[0]
  const extraCount = Math.max(approvers.length - 1, 0)
  const typeLabel = TYPE_APPROVAL_LABEL[step.typeApprovalId] ?? 'Phê duyệt'
  const rejectTarget = step.nextProcessIfDeniedId
    ? stepsById[step.nextProcessIfDeniedId]
    : undefined

  const TypeIcon =
    TYPE_ICONS[step.typeApprovalId as keyof typeof TYPE_ICONS] ?? Users

  const card = (
    <div
      className={cn(
        'w-80 overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow',
        selected ? `ring-2 ${theme.ringClass}` : 'hover:shadow-md',
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className={cn(theme.handleClass, '!size-2 !border-2 !border-background')}
      />

      {/* Reject jump — rendered above the card so the backward path reads clearly */}
      {rejectTarget ? (
        <div className="flex items-center gap-1.5 border-b border-border/60 bg-red-50/70 px-3 py-1.5 text-[10px] font-medium text-red-600 dark:bg-red-950/50 dark:text-red-400">
          <CornerUpLeft className="size-3 shrink-0" />
          <span className="truncate">Nhảy về: {rejectTarget.processName}</span>
        </div>
      ) : null}

      <div className="border-l-4" style={{ borderLeftColor: theme.accent }}>
        <div className="flex items-start justify-between gap-2 px-3 pb-2 pt-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {step.processName}
            </p>
            {step.description ? (
              <p className="truncate text-[11px] text-muted-foreground">
                {step.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2 px-3 pb-3">
          {/* Assignment — type chip + resource name + overflow counter */}
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                Phân công
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                    theme.badgeClasses,
                  )}
                >
                  <TypeIcon className="size-3 shrink-0" />
                  {typeLabel}
                </span>
                <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground">
                  <span className="truncate">
                    {primaryApprover?.resourceName ?? 'Chưa chọn'}
                  </span>
                  {extraCount > 0 ? (
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-1 text-[10px] font-semibold',
                        theme.badgeClasses,
                      )}
                      title={`${extraCount} người duyệt khác`}
                    >
                      +{extraCount}
                    </span>
                  ) : null}
                </span>
              </div>
            </div>
          </div>

          {/* Triggers & Actions */}
          <div>
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Trigger &amp; Hành động
            </p>
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowActions((v) => !v)
                }}
                className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
                aria-expanded={showActions}
              >
                <Webhook className="size-3" />
                Hành động
                <ChevronDown
                  className={cn('size-2.5 transition-transform', showActions && 'rotate-180')}
                />
              </button>

              {step.worklogTemplateName ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300">
                  <FileText className="size-3" />
                  Worklog
                </span>
              ) : null}
            </div>

            {showActions ? (
              <div className="mt-2 rounded-lg border border-border bg-background p-2 shadow-sm">
                <p className="mb-1 text-[10px] text-muted-foreground">
                  Cấu hình hành động đi ra cho bước này trong bảng chi tiết.
                </p>
                {step.worklogTemplateName ? (
                  <p className="text-[10px] font-medium text-foreground">
                    Worklog: {step.worklogTemplateName}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className={cn(theme.handleClass, '!size-2 !border-2 !border-background')}
      />
    </div>
  )

  return (
    <ApproverPreviewTooltip processId={step.id}>{card}</ApproverPreviewTooltip>
  )
}

export const ApprovalStepNode = memo(ApprovalStepNodeComponent)
