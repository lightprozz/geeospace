'use client'
// ---------------------------------------------------------------------------
// approver-preview-tooltip.tsx
// Hover preview of the users a step resolves to at runtime.
//
// The resolution is authoritative on the backend, so the tooltip reads the
// approver-preview endpoint rather than trying to derive the user list from
// the configured approver ids.
// ---------------------------------------------------------------------------

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useApproverPreview } from '../../hooks/use-approver-preview'
import { Loader2, Users } from 'lucide-react'

interface ApproverPreviewTooltipProps {
  /** The step whose approvers are previewed. */
  processId: string
  /** The element the tooltip is attached to. */
  children: React.ReactNode
}

export function ApproverPreviewTooltip({
  processId,
  children,
}: ApproverPreviewTooltipProps) {
  const { data, isLoading, isError } = useApproverPreview(processId)

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={8}
        className="max-w-xs flex-col items-start gap-2 p-3"
      >
        {isLoading ? (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Đang tải người duyệt…
          </span>
        ) : isError ? (
          <span className="text-muted-foreground">
            Không tải được danh sách người duyệt.
          </span>
        ) : !data || data.users.length === 0 ? (
          <span className="text-muted-foreground">
            Chưa có người duyệt nào được phân công.
          </span>
        ) : (
          <>
            <span className="font-semibold">
              {data.typeLabel} · {data.resourceName}
            </span>
            <span className="flex items-start gap-1.5 text-muted-foreground">
              <Users className="mt-0.5 size-3 shrink-0" />
              <span className="flex flex-col">
                {data.users.map((user) => (
                  <span key={user.id}>
                    {user.fullName}
                    {user.isGroupAdmin ? ' (quản trị)' : ''}
                  </span>
                ))}
              </span>
            </span>
            {data.totalCount > data.users.length ? (
              <span className="text-muted-foreground">
                và {data.totalCount - data.users.length} người khác
              </span>
            ) : null}
          </>
        )}
      </TooltipContent>
    </Tooltip>
  )
}
