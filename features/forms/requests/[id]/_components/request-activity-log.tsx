'use client'
// ---------------------------------------------------------------------------
// _components/request-activity-log.tsx
// Activity timeline for a request: newest first.
// Color-coded by action type (approved=green, denied=red, commented=blue, etc.).
// ---------------------------------------------------------------------------

import {
  CheckCircle,
  XCircle,
  MessageSquare,
  ArrowRight,
  Clock,
} from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { ActivityDto } from "@/features/lms/types/request"

interface RequestActivityLogProps {
  activities: ActivityDto[]
  isLoading: boolean
}

function ActivityIcon({ formStatus }: { formStatus: number }) {
  if (formStatus === 3) {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100">
        <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
      </div>
    )
  }
  if (formStatus === 4) {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100">
        <XCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
      </div>
    )
  }
  if (formStatus === 2) {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100">
        <ArrowRight className="h-4 w-4 text-blue-600" aria-hidden="true" />
      </div>
    )
  }
  if (formStatus === 1) {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-100">
        <Clock className="h-4 w-4 text-yellow-600" aria-hidden="true" />
      </div>
    )
  }
  // Default: comment / info
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
      <MessageSquare className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
    </div>
  )
}

function activityDescription(activity: ActivityDto): string {
  switch (activity.formStatus) {
    case 3:
      return `approved this request`
    case 4:
      return `denied this request`
    case 2:
      return `moved this request to the next step`
    case 1:
      return `created this request`
    default:
      return activity.note || `updated this request`
  }
}

function activityColor(formStatus: number): string {
  switch (formStatus) {
    case 3:
      return "text-green-700"
    case 4:
      return "text-red-700"
    case 2:
      return "text-blue-700"
    default:
      return "text-foreground"
  }
}

export function RequestActivityLog({
  activities,
  isLoading,
}: RequestActivityLogProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-28" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-7 w-7 rounded-full" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!activities?.length) {
    return null
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <h3 className="text-sm font-semibold">Activity</h3>

      <div className="relative">
        {/* Vertical timeline line */}
        <div
          className="absolute left-3.5 top-3 h-[calc(100%-1.5rem)] w-px bg-border"
          aria-hidden="true"
        />

        <div className="flex flex-col gap-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <ActivityIcon formStatus={activity.formStatus} />

              <div className="flex flex-col gap-0.5">
                <p className={cn("text-sm", activityColor(activity.formStatus))}>
                  <span className="font-medium">{activity.fullName}</span>{" "}
                  {activityDescription(activity)}
                </p>

                {activity.note && activity.formStatus !== 4 && (
                  <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                    {activity.note}
                  </p>
                )}

                <time className="text-xs text-muted-foreground">
                  {new Date(activity.createdDate).toLocaleString()}
                </time>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
