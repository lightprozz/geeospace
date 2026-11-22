'use client'
// ---------------------------------------------------------------------------
// _components/request-action-bar.tsx
// Approve / Deny / Assign buttons — render ONLY when server flags are true.
// Never client-recomputes eligibility. Approve AND Deny are additionally gated
// when worklogFilled is false (mirrors the 422 WORKLOG_REQUIRED contract, which
// the server enforces for BOTH transitions).
//
// TOOLTIPS ON DISABLED BUTTONS. A disabled HTML button emits no pointer
// events, so a tooltip anchored to it can never open. The disabled control is
// therefore wrapped in a focusable `<span tabIndex={0}>` that carries the
// tooltip trigger — the tooltip then works for both mouse and keyboard users.
//
// ARCHIVE. Hide/Unhide belongs to the CREATOR. The inbox offers it on the
// CREATED tab (server-filtered to the caller's own requests); the detail page
// offers it when the caller IS the creator, so the same action is reachable
// from both surfaces.
// ---------------------------------------------------------------------------

import { useState } from "react"
import { type UseQueryResult } from "@tanstack/react-query"
import { Archive, ArchiveRestore } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuthStore } from "@/stores/use-auth-store"
import { useSetRequestArchived } from "@/features/lms/hooks/requests/use-request-mutations"
import { getErrorDetail } from "@/features/lms/lib/requests/api"
import type { RequestDetail } from "@/features/lms/types/request"

import { ApproveDialog } from "./approve-dialog"
import { DenyDialog } from "./deny-dialog"
import { AssignDialog } from "./assign-dialog"

interface RequestActionBarProps {
  detail: RequestDetail
  /** Pass the query so dialogs can await refetch() before error handling. */
  detailQuery: UseQueryResult<RequestDetail>
  onMutationError: (
    err: unknown,
    detailQ: UseQueryResult<RequestDetail>,
    worklogRequired?: () => void
  ) => Promise<void>
  onWorklogRequired: () => void
}

export function RequestActionBar({
  detail,
  detailQuery,
  onMutationError,
  onWorklogRequired,
}: RequestActionBarProps) {
  const [showApprove, setShowApprove] = useState(false)
  const [showDeny, setShowDeny] = useState(false)
  const [showAssign, setShowAssign] = useState(false)

  const currentUserId = useAuthStore((s) => s.user?.sub ?? null)
  const archiveMutation = useSetRequestArchived()

  // Approve and Deny are blocked both by the server flag AND when the worklog
  // is required but unfilled — the server refuses both with WORKLOG_REQUIRED.
  const approveBlockedByWorklog =
    Boolean(detail.needToDo) && !detail.worklogFilled
  const denyBlockedByWorklog = approveBlockedByWorklog

  const canApprove = detail.canApprove
  const canAssign = detail.canAssign
  const isCreator = Boolean(currentUserId) && currentUserId === detail.createdById

  const handleArchiveToggle = async () => {
    try {
      await archiveMutation.mutateAsync({
        id: detail.id,
        input: { archived: !detail.isArchived },
        updatedAt: detail.updatedAt,
      })
      toast.success(
        detail.isArchived ? "Request unhidden." : "Request hidden."
      )
    } catch (err) {
      toast.error(
        getErrorDetail(err, "Could not update the request visibility.")
      )
    }
  }

  if (!canApprove && !canAssign && !isCreator) return null

  return (
    <>
      <div className="flex flex-col gap-2 rounded-xl border bg-card p-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Actions
        </span>
        <div className="flex flex-col gap-2">
          {/* Approve */}
          {canApprove &&
            (approveBlockedByWorklog ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="w-full">
                    <Button
                      variant="default"
                      size="sm"
                      disabled
                      className="w-full"
                    >
                      Approve
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Complete the worklog form below to unlock approval.
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="default"
                size="sm"
                className="w-full"
                onClick={() => setShowApprove(true)}
              >
                Approve
              </Button>
            ))}

          {/* Deny — only for callers who can approve */}
          {canApprove &&
            (denyBlockedByWorklog ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="w-full"
                    >
                      Deny
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Complete the worklog form below to unlock denial.
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowDeny(true)}
              >
                Deny
              </Button>
            ))}

          {/* Assign */}
          {canAssign && (
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => setShowAssign(true)}
            >
              Assign
            </Button>
          )}

          {/* Hide / Unhide — creator only */}
          {isCreator && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-1.5"
                  disabled={archiveMutation.isPending}
                  onClick={handleArchiveToggle}
                >
                  {detail.isArchived ? (
                    <ArchiveRestore className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Archive className="h-4 w-4" aria-hidden="true" />
                  )}
                  {detail.isArchived ? "Unhide request" : "Hide request"}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {detail.isArchived
                  ? "Make this request visible again."
                  : "Hide this request from the inbox."}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {showApprove && (
        <ApproveDialog
          detail={detail}
          detailQuery={detailQuery}
          onClose={() => setShowApprove(false)}
          onMutationError={onMutationError}
          onWorklogRequired={onWorklogRequired}
        />
      )}
      {showDeny && (
        <DenyDialog
          detail={detail}
          detailQuery={detailQuery}
          onClose={() => setShowDeny(false)}
          onMutationError={onMutationError}
          onWorklogRequired={onWorklogRequired}
        />
      )}
      {showAssign && (
        <AssignDialog
          detail={detail}
          detailQuery={detailQuery}
          onClose={() => setShowAssign(false)}
          onMutationError={onMutationError}
        />
      )}
    </>
  )
}
