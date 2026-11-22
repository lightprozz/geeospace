'use client'
// ---------------------------------------------------------------------------
// _components/approve-dialog.tsx
// Confirm dialog for approving a request.
// Sends POST /{id}/approve with If-Unmodified-Since.
// Calls onMutationError which handles 409 CONFLICT, 422 NOT_ELIGIBLE /
// REQUEST_TERMINAL / WORKLOG_REQUIRED with appropriate toast + refetch.
//
// DIALOG STAYS OPEN ON FAILURE. A refused approval is data-driven, not a
// crash: the server answers 422/409 with a reason. Closing the dialog would
// throw away the note the approver typed and force them to start over, so
// the dialog is only closed on SUCCESS.
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
import { useApproveRequest } from "@/features/lms/hooks/requests/use-request-mutations"
import type { RequestDetail } from "@/features/lms/types/request"

interface ApproveDialogProps {
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

export function ApproveDialog({
  detail,
  detailQuery,
  onClose,
  onMutationError,
  onWorklogRequired,
}: ApproveDialogProps) {
  const [note, setNote] = useState("")
  const mutation = useApproveRequest()

  const handleConfirm = async () => {
    if (!detail.currentWorkflowId) {
      toast.error(
        "This request has no active workflow step. Reload the page and try again."
      )
      return
    }

    try {
      await mutation.mutateAsync({
        id: detail.id,
        input: {
          workflowId: detail.currentWorkflowId,
          note: note.trim() || undefined,
        },
        updatedAt: detail.updatedAt,
      })
      onClose()
    } catch (err) {
      // Refetch detail, then show toast — runs AFTER fresh data is in cache.
      // The dialog STAYS OPEN so the entered note is preserved.
      await onMutationError(err, detailQuery, onWorklogRequired)
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Approve this request?</AlertDialogTitle>
          <AlertDialogDescription>
            This will advance the request to the next step. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="approve-note" className="text-sm font-medium">
            Note{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="approve-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note for your approval..."
            rows={3}
            className="resize-none"
          />
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
            variant="default"
            size="sm"
            onClick={handleConfirm}
            disabled={mutation.isPending}
            className="gap-1.5"
          >
            {mutation.isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            )}
            Approve
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
