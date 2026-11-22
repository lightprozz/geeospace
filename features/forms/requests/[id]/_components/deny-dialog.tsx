'use client'
// ---------------------------------------------------------------------------
// _components/deny-dialog.tsx
// Reason dialog for denying a request.
// Sends POST /{id}/deny with If-Unmodified-Since.
// Calls onMutationError which handles 409 CONFLICT, 422 NOT_ELIGIBLE /
// REQUEST_TERMINAL with appropriate toast + refetch.
//
// DIALOG STAYS OPEN ON FAILURE. The typed reason is the most expensive thing
// the approver has typed on this screen — a refused denial (409/422) must not
// discard it. The dialog closes only on SUCCESS.
// ---------------------------------------------------------------------------

import { useState } from "react"
import { type UseQueryResult } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useDenyRequest } from "@/features/lms/hooks/requests/use-request-mutations"
import type { RequestDetail } from "@/features/lms/types/request"

interface DenyDialogProps {
  detail: RequestDetail
  detailQuery: UseQueryResult<RequestDetail>
  onClose: () => void
  onMutationError: (
    err: unknown,
    detailQ: UseQueryResult<RequestDetail>,
    worklogRequired?: () => void
  ) => Promise<void>
  /** Scroll the worklog card into view when the server demands a worklog. */
  onWorklogRequired?: () => void
}

export function DenyDialog({
  detail,
  detailQuery,
  onClose,
  onMutationError,
  onWorklogRequired,
}: DenyDialogProps) {
  const [reason, setReason] = useState("")
  const [touched, setTouched] = useState(false)
  const mutation = useDenyRequest()

  const handleConfirm = async () => {
    setTouched(true)
    if (!reason.trim()) return

    if (!detail.currentWorkflowId) {
      toast.error(
        "This request has no active workflow step. Reload the page and try again."
      )
      return
    }

    try {
      await mutation.mutateAsync({
        id: detail.id,
        input: { workflowId: detail.currentWorkflowId, note: reason.trim() },
        updatedAt: detail.updatedAt,
      })
      onClose()
    } catch (err) {
      // The dialog STAYS OPEN so the typed reason is preserved.
      await onMutationError(err, detailQuery, onWorklogRequired)
    }
  }

  const reasonError = touched && !reason.trim()

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Deny this request?</AlertDialogTitle>
          <AlertDialogDescription>
            Please provide a reason for denial. The requester will be notified.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="deny-reason" className="text-sm font-medium">
            Reason{" "}
            <span aria-hidden="true" className="text-destructive">*</span>
            <span className="sr-only">(required)</span>
          </Label>
          <Textarea
            id="deny-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="Enter the reason for denial..."
            rows={3}
            className="resize-none"
            aria-invalid={reasonError}
            aria-describedby={reasonError ? "deny-reason-error" : undefined}
          />
          {reasonError && (
            <p id="deny-reason-error" className="text-xs text-destructive">
              Reason is required.
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleConfirm}
            disabled={mutation.isPending || !reason.trim()}
            className="gap-1.5"
          >
            {mutation.isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            )}
            Deny Request
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
