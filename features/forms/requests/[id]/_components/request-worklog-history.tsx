'use client'
// ---------------------------------------------------------------------------
// _components/request-worklog-history.tsx
// The request's worklog HISTORY — every step that has a worklog, oldest first.
//
// Read-only by construction: the answers live on the step, so this view can
// never advance the request. It renders the saved answers through the same
// `FormRenderer` the live worklog form uses, in `readonly` + `compact` mode,
// so a saved worklog looks exactly like the form the approver filled in.
//
// A step with a worklog TEMPLATE but no saved answers comes back with
// `fields: []` and a null `workLogByName` — that is the "this step had a
// worklog and it was never filled in" case, and it is shown as such rather
// than silently skipped.
// ---------------------------------------------------------------------------

import { ClipboardList } from "lucide-react"

import { FormRenderer } from "@/features/forms/form-renderer/form-renderer"
import { Skeleton } from "@/components/ui/skeleton"
import { useRequestWorklogs } from "@/features/lms/hooks/requests/use-request-detail"

interface RequestWorklogHistoryProps {
  requestId: string
}

export function RequestWorklogHistory({ requestId }: RequestWorklogHistoryProps) {
  const worklogsQuery = useRequestWorklogs(requestId)
  const worklogs = worklogsQuery.data ?? []

  if (worklogsQuery.isLoading) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-4 h-24 w-full" />
      </div>
    )
  }

  // Nothing to show — the request has no worklog at all.
  if (worklogs.length === 0) return null

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2">
        <ClipboardList
          className="h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <h3 className="text-sm font-semibold">Work Log History</h3>
      </div>

      <div className="mt-4 flex flex-col gap-5">
        {worklogs.map((worklog) => (
          <section key={worklog.stepId} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <h4 className="text-sm font-medium">{worklog.stepName}</h4>
              {worklog.workLogByName ? (
                <span className="text-xs text-muted-foreground">
                  {worklog.workLogByName}
                  {worklog.workLogAt && (
                    <> — {new Date(worklog.workLogAt).toLocaleString()}</>
                  )}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Not filled in
                </span>
              )}
            </div>

            {worklog.fields.length > 0 ? (
              <FormRenderer
                mode="readonly"
                density="compact"
                fields={worklog.fields}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                No answers were saved for this step.
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
