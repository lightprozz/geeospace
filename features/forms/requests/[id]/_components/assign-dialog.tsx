'use client'
// ---------------------------------------------------------------------------
// _components/assign-dialog.tsx
// Approver-candidate search dialog for assigning a request.
// Reads the candidate set from `useApproverCandidates` (GET
// /lookups/approver-candidates?processId=) and sends POST /{id}/assign.
//
// CANDIDATE SOURCE. The set is the server's, never a general user lookup:
// `assignRequest` refuses any id outside it with 422 NOT_ELIGIBLE, and the
// endpoint excludes the current holder.
//
// QUERY FAILURE IS SHOWN. A failed lookup used to render an empty list that
// read as "no candidates", which sends the approver to the wrong conclusion.
// The error is rendered in place of the list instead.
// ---------------------------------------------------------------------------

import { useMemo, useState } from "react"
import { type UseQueryResult } from "@tanstack/react-query"
import { AlertTriangle, Loader2, Search, User } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAssignRequest } from "@/features/lms/hooks/requests/use-request-mutations"
import { useApproverCandidates } from "@/features/lms/hooks/requests/use-approver-candidates"
import { getErrorDetail } from "@/features/lms/lib/requests/api"
import type { RequestDetail, UserOptionDto } from "@/features/lms/types/request"
interface AssignDialogProps {
  detail: RequestDetail
  detailQuery: UseQueryResult<RequestDetail>
  onClose: () => void
  onMutationError: (
    err: unknown,
    detailQ: UseQueryResult<RequestDetail>,
    worklogRequired?: () => void
  ) => Promise<void>
}

export function AssignDialog({
  detail,
  detailQuery,
  onClose,
  onMutationError,
}: AssignDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const mutation = useAssignRequest()

  // Find the current step's processId
  const currentProcess = detail.processes[detail.currentStepIndex]
  const processId = currentProcess?.id ?? null

  const candidatesQuery = useApproverCandidates(processId)

  const filtered = useMemo<UserOptionDto[]>(() => {
    const raw = candidatesQuery.data ?? []
    if (!search.trim()) return raw
    const q = search.toLowerCase()
    return raw.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
    )
  }, [candidatesQuery.data, search])

  const handleConfirm = async () => {
    if (!selectedId || !processId) return

    try {
      await mutation.mutateAsync({
        id: detail.id,
        input: { processId, userId: selectedId },
        updatedAt: detail.updatedAt,
      })
      onClose()
    } catch (err) {
      // The dialog STAYS OPEN so the selection is preserved. The toast comes
      // from `onMutationError`, which knows the refusal codes.
      await onMutationError(err, detailQuery)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign Approver</DialogTitle>
          <DialogDescription>
            Select a user to reassign the current step.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Candidates list */}
        <div className="max-h-60 overflow-y-auto rounded-md border">
          {candidatesQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-6">
              <Loader2
                className="h-4 w-4 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
              <span className="text-sm text-muted-foreground">
                Loading candidates...
              </span>
            </div>
          ) : candidatesQuery.isError ? (
            <div
              role="alert"
              className="flex flex-col items-center gap-2 px-3 py-6 text-center"
            >
              <AlertTriangle
                className="h-5 w-5 text-destructive"
                aria-hidden="true"
              />
              <p className="text-sm font-medium text-destructive">
                Could not load candidates
              </p>
              <p className="text-xs text-muted-foreground">
                {getErrorDetail(
                  candidatesQuery.error,
                  "Please try again in a moment."
                )}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No candidates found.
            </div>
          ) : (
            <div className="flex flex-col">
              {filtered.map((candidate) => {
                const isSelected = selectedId === candidate.id
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedId(candidate.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted ${
                      isSelected ? "bg-muted" : ""
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <User
                        className="h-4 w-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {candidate.fullName}
                      </span>
                      {candidate.email && (
                        <span className="text-xs text-muted-foreground">
                          {candidate.email}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <div className="ml-auto">
                        <div className="h-2 w-2 rounded-full bg-blue-600" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
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
            disabled={!selectedId || mutation.isPending}
            className="gap-1.5"
          >
            {mutation.isPending && (
              <Loader2
                className="h-3.5 w-3.5 animate-spin"
                aria-hidden="true"
              />
            )}
            Assign
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
