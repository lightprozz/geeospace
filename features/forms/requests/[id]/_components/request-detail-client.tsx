'use client'
// ---------------------------------------------------------------------------
// _components/request-detail-client.tsx
// Client shell for the Request Detail page.
// Fetches detail + comments + activities in parallel, owns the two-column
// layout, and coordinates all child components.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef } from "react"
import { useRouter, WindowLink } from "@/features/forms/window-adapter"
import { AlertTriangle, ChevronLeft } from "lucide-react"
import type { UseQueryResult } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useSetDashboardHeader } from "@/features/forms/window-adapter"
import {
  useRequestActivities,
  useRequestComments,
  useRequestDetail,
} from "@/features/lms/hooks/requests/use-request-detail"
import { useOpenRequest } from "@/features/lms/hooks/requests/use-request-mutations"
import type { ApiError } from "@/lib/api-client"
import {
  getErrorDetail,
  isConflictError,
  isNotEligibleError,
  isRequestTerminalError,
  isWorklogRequiredError,
} from "@/features/lms/lib/requests/api"
import { RequestFormStatus, type RequestDetail } from "@/features/lms/types/request"

import { RequestProcessStepper } from "./request-process-stepper"
import { RequestMetadataFields } from "./request-metadata-fields"
import { RequestActionBar } from "./request-action-bar"
import { WorklogStepCard } from "./worklog-step-card"
import { RequestWorklogHistory } from "./request-worklog-history"
import { RequestDiscussion } from "./request-discussion"
import { RequestActivityLog } from "./request-activity-log"
import { RequestPropertiesSidebar } from "./request-properties-sidebar"
import { RequestWatchers } from "./request-watchers"

// ---------------------------------------------------------------------------
// Comment derivation helper — pure, no hooks
// ---------------------------------------------------------------------------

export interface CommentThread {
  root: import("@/features/lms/types/request").CommentDto
  replies: import("@/features/lms/types/request").CommentDto[]
}

/** Derive a flat oldest-first comment list into a threaded tree. */
export function deriveThreads(
  comments: import("@/features/lms/types/request").CommentDto[]
): CommentThread[] {
  const roots = comments.filter((c) => !c.rootId)
  return roots.map((root) => ({
    root,
    replies: comments
      .filter((c) => c.rootId === root.id)
      .sort(
        (a, b) =>
          new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime()
      ),
  }))
}

// ---------------------------------------------------------------------------
// Client shell
// ---------------------------------------------------------------------------

interface RequestDetailClientProps {
  id: string
}

export function RequestDetailClient({ id }: RequestDetailClientProps) {
  const router = useRouter()
  const worklogCardRef = useRef<HTMLDivElement>(null)

  // Parallel fetch: detail, comments, activities
  const detailQuery = useRequestDetail(id)

  const commentsQuery = useRequestComments(id)

  const activitiesQuery = useRequestActivities(id)

  const openMutation = useOpenRequest()

  // -----------------------------------------------------------------------
  // Auto-open: a request that reaches an approver for the first time must
  // move New(1) → Processing(2), otherwise it stays "New" forever and the
  // approval clock never starts. The server-side transition is idempotent, so
  // a re-render or a second tab cannot double-open it.
  // -----------------------------------------------------------------------
  const shouldAutoOpen =
    !!detailQuery.data &&
    detailQuery.data.canApprove &&
    detailQuery.data.formStatus === RequestFormStatus.New
  const autoOpenedRef = useRef(false)

  useEffect(() => {
    if (!shouldAutoOpen || autoOpenedRef.current) return
    if (!detailQuery.data) return
    autoOpenedRef.current = true
    openMutation
      .mutateAsync({ id, updatedAt: detailQuery.data.updatedAt })
      .catch((err) => {
        // A refusal here is not fatal — the request may have been opened by
        // another approver a moment earlier — so the reason is surfaced
        // without blocking the page.
        toast.error(
          getErrorDetail(err, "Could not start processing for this request.")
        )
      })
  }, [shouldAutoOpen, id, detailQuery.data, openMutation])

  // Derive threads from comments
  const threads = useMemo<CommentThread[]>(() => {
    const raw = commentsQuery.data
    if (!raw) return []
    return deriveThreads(raw)
  }, [commentsQuery.data])

  const isLoading =
    detailQuery.isLoading || commentsQuery.isLoading || activitiesQuery.isLoading

  // Dashboard header — always set (hooks before any conditional return)
  useSetDashboardHeader({
    breadcrumbs: (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <WindowLink href="/requests">Requests</WindowLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="max-w-48 truncate">
              {detailQuery.data?.subject ?? "Request Detail"}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    ),
  })

  // Error state — shown after all hooks have been called
  if (detailQuery.isError) {
    // A 404 means the request genuinely does not exist (or was purged); any
    // other failure is a transport/server problem the person can retry. They
    // need different messages — "not found" would send them hunting for a
    // request that is simply right there.
    const isNotFound = (detailQuery.error as ApiError | undefined)?.status === 404

    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <AlertTriangle
            className="h-10 w-10 text-destructive"
            aria-hidden="true"
          />
          <h2 className="text-base font-semibold text-foreground">
            {isNotFound ? "Request not found" : "Could not load this request"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isNotFound
              ? "This request may not exist or you do not have access to view it."
              : "Something went wrong while loading the request. Please try again."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isNotFound && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => detailQuery.refetch()}
            >
              Try again
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/requests")}
            className="gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Back to Requests
          </Button>
        </div>
      </div>
    )
  }

  // Loading skeleton
  if (isLoading || !detailQuery.data) {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden">
        <div className="flex flex-1 flex-col lg:flex-row">
          {/* Left column skeleton */}
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          {/* Right sidebar skeleton */}
          <div className="flex w-full flex-col gap-4 border-t bg-muted/30 px-6 py-5 lg:h-full lg:w-80 lg:border-t-0 lg:border-l lg:overflow-y-auto">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    )
  }

  const detail = detailQuery.data as RequestDetail
  const currentStep = detail.processes[detail.currentStepIndex] ?? null
  // -----------------------------------------------------------------------
  // Error handlers — run in the parent so they always read the LATEST
  // detail from the query cache (detailQuery ref passed to dialogs so they
  // can await refetch() before these fire, ensuring fresh data).
  // -----------------------------------------------------------------------

  /** Handle any error from an approve/deny/assign mutation. Refetches detail
   *  from the server, then shows a contextual toast. Calling await on
   *  detailQuery.refetch() ensures this reads the fresh data. */
  async function handleMutationError(
    err: unknown,
    detailQ: UseQueryResult<RequestDetail>,
    worklogRequired?: () => void
  ) {
    await detailQ.refetch()

    if (isConflictError(err)) {
      toast.error("This request was modified by another user. Please review and try again.")
    } else if (isNotEligibleError(err)) {
      toast.error("You are no longer eligible to perform this action.")
    } else if (isRequestTerminalError(err)) {
      toast.error("This request has already been completed.")
    } else if (isWorklogRequiredError(err)) {
      toast.error("Please complete the worklog form before approving.")
      worklogRequired?.()
    } else {
      toast.error("An unexpected error occurred. Please try again.")
    }
  }

  const handleWorklogSaved = () => {
    detailQuery.refetch()
    toast.success("Worklog saved.")
  }

  const handleWorklogError = (message: string) => {
    toast.error(message)
  }

  const handleFocusWorklog = () => {
    worklogCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        {/* Left: narrative column */}
        <div className="flex min-h-0 min-w-0 shrink-0 flex-col gap-4 px-6 py-5 lg:flex-1 lg:overflow-y-auto">
          {/* Process stepper */}
          <RequestProcessStepper
            processes={detail.processes}
            currentStepIndex={detail.currentStepIndex}
            formStatus={detail.formStatus}
          />

          {/* Worklog step card — shown above metadata when required.
              The key follows the step: when the workflow advances, the card
              belongs to a DIFFERENT step and its draft must not leak across. */}
          {detail.needToDo && detail.canApprove && (
            <div ref={worklogCardRef}>
              <WorklogStepCard
                key={currentStep?.id ?? "worklog"}
                requestId={id}
                processId={currentStep?.id ?? null}
                currentWorkflowId={detail.currentWorkflowId ?? null}
                updatedAt={detail.updatedAt}
                canApprove={detail.canApprove}
                needToDo={detail.needToDo}
                worklogFilled={detail.worklogFilled}
                onSaved={handleWorklogSaved}
                onError={handleWorklogError}
                onFocusWorklog={handleFocusWorklog}
              />
            </div>
          )}

          {/* Metadata fields — readonly renderer */}
          <RequestMetadataFields fields={detail.fields} />

          {/* Work log history — the read-only record of the work already done
              on this request, one entry per step. */}
          <RequestWorklogHistory requestId={id} />

          {/* Discussion */}
          <RequestDiscussion
            requestId={id}
            threads={threads}
            isLoading={commentsQuery.isLoading}
            formStatus={detail.formStatus}
          />

          {/* Activity log */}
          <RequestActivityLog
            activities={activitiesQuery.data ?? []}
            isLoading={activitiesQuery.isLoading}
          />
        </div>

        {/* Right: sticky sidebar */}
        <div className="flex w-full flex-col gap-4 border-t bg-muted/30 px-6 py-5 lg:h-full lg:w-80 lg:max-w-xs lg:flex-none lg:overflow-y-auto lg:border-t-0 lg:border-l">
          {/* Properties sidebar */}
          <RequestPropertiesSidebar detail={detail} />

          {/* Watchers */}
          <RequestWatchers watchers={detail.watchers} />

          {/* Action bar */}
          <RequestActionBar
            detail={detail}
            detailQuery={detailQuery}
            onMutationError={handleMutationError}
            onWorklogRequired={handleFocusWorklog}
          />
        </div>
      </div>
    </div>
  )
}
