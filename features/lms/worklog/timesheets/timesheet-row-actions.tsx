'use client'
// ---------------------------------------------------------------------------
// _components/timesheet-row-actions.tsx
// Approve/Reject action for ONE WorkLogItemV2 entry (POST /worklog/{id}/status).
//
// The unit of action is a single entry, not a grid row/cell — a cell can
// hold multiple entries (no uniqueness constraint on teacher+class+effort+
// date), each with its own concurrency token, so approve/reject is scoped
// per-entry and surfaced inside cell-entries-popover's entry list.
// ---------------------------------------------------------------------------

import { Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useSetWorkLogStatus } from '@/features/lms/hooks/worklog/use-worklog-mutations'
import { isApprovedLockedError, isConcurrencyError } from '@/features/lms/lib/worklog/api'
import { WorkLogStatusV2 } from '@/features/lms/types/worklog'
import type { WorkLogItemV2 } from '@/features/lms/types/worklog'

interface TimesheetRowActionsProps {
  entry: WorkLogItemV2
  /** True when the caller owns this worklog — the BE forbids self-approve. */
  isOwnEntry: boolean
  /**
   * Called after a successful status change with the updated `WorkLogItemV2`
   * (the `/status` response) — the caller patches it straight into the
   * grid's cached data, no refetch needed.
   */
  onStatusChanged: (updated: WorkLogItemV2) => void
  /**
   * Called on a 409 CONFLICT (stale `If-Unmodified-Since`) — a full grid
   * refetch, since the cache may be wrong in ways a single-entry patch can't
   * fix.
   */
  onConflict: () => void
}

export function TimesheetRowActions({
  entry,
  isOwnEntry,
  onStatusChanged,
  onConflict,
}: TimesheetRowActionsProps) {
  const setStatus = useSetWorkLogStatus()

  const handleSetStatus = async (status: 'Accepted' | 'Rejected') => {
    try {
      const updated = await setStatus.mutateAsync({ id: entry.id, status, updatedAt: entry.updatedAt })
      toast.success(status === 'Accepted' ? 'Worklog approved.' : 'Worklog rejected.')
      onStatusChanged(updated)
    } catch (error) {
      if (isConcurrencyError(error)) {
        toast.error('This worklog changed since it was loaded. Refreshing…')
        onConflict()
      } else if (isApprovedLockedError(error)) {
        // Not expected from this endpoint (approved-lock only guards PUT/DELETE
        // per the contract), but branch defensively rather than assume.
        toast.error('This worklog is locked and can only be changed by an approver.')
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to update status.')
      }
    }
  }

  const isPending = setStatus.isPending
  const isAccepted = entry.status === WorkLogStatusV2.Accepted
  const isRejected = entry.status === WorkLogStatusV2.Rejected
  const disabled = isPending || isOwnEntry

  return (
    <div className="flex items-center gap-1" title={isOwnEntry ? 'You cannot approve or reject your own worklog.' : undefined}>
      <Button
        variant={isAccepted ? 'default' : 'outline'}
        size="sm"
        className="h-6 px-2 text-[10px] gap-1"
        disabled={disabled || isAccepted}
        onClick={() => handleSetStatus('Accepted')}
      >
        <Check className="h-3 w-3" />
        Approve
      </Button>
      <Button
        variant={isRejected ? 'destructive' : 'outline'}
        size="sm"
        className="h-6 px-2 text-[10px] gap-1"
        disabled={disabled || isRejected}
        onClick={() => handleSetStatus('Rejected')}
      >
        <X className="h-3 w-3" />
        Reject
      </Button>
    </div>
  )
}
