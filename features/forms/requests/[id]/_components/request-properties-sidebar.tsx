'use client'
// ---------------------------------------------------------------------------
// _components/request-properties-sidebar.tsx
// Right sidebar card: requester, assignee, group, status, time, dates.
// ---------------------------------------------------------------------------

import {
  type RequestDetail,
} from "@/features/lms/types/request"
import { formatAbsoluteDate, formatRemainingTime } from "@/features/lms/lib/requests/time"
import { cn } from "@/lib/utils"

function StatusBadge({ formStatus }: { formStatus: number }) {
  const label =
    formStatus === 100
      ? "Draft"
      : formStatus === 1
        ? "New"
        : formStatus === 2
          ? "Processing"
          : formStatus === 3
            ? "Approved"
            : formStatus === 4
              ? "Denied"
              : formStatus === 5
                ? "Closed"
                : "Expired"

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        formStatus === 3 && "bg-green-100 text-green-700",
        formStatus === 4 && "bg-red-100 text-red-700",
        (formStatus === 5 || formStatus === 6) && "bg-muted text-muted-foreground",
        formStatus === 2 && "bg-primary/10 text-primary",
        formStatus === 1 && "bg-yellow-100 text-yellow-700",
        formStatus === 100 && "bg-gray-100 text-gray-600"
      )}
    >
      {label}
    </span>
  )
}

interface RequestPropertiesSidebarProps {
  detail: RequestDetail
}

export function RequestPropertiesSidebar({ detail }: RequestPropertiesSidebarProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Details
      </h3>

      {/* Requester */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Requester</span>
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {detail.createdByName.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{detail.createdByName}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(detail.createdDate).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Current Assignee(s) */}
      {detail.resolvedApprovers.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Current Assignee</span>
          <div className="flex flex-col gap-1">
            {detail.resolvedApprovers.map((approver) => (
              <span key={approver.id} className="text-sm">
                {approver.fullName}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Collection */}
      {detail.collectionName && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Group</span>
          <span className="text-sm">{detail.collectionName}</span>
        </div>
      )}

      {/* Template */}
      {detail.templateName && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Template</span>
          <span className="text-sm">{detail.templateName}</span>
        </div>
      )}

      {/* Hint groups — the collections the request was routed to. */}
      {detail.hintGroups && detail.hintGroups.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Hint Groups</span>
          <div className="flex flex-wrap gap-1">
            {detail.hintGroups.map((group) => (
              <span
                key={group}
                className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {group}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Status */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Status</span>
        <StatusBadge formStatus={detail.formStatus} />
      </div>

      {/* Expiry — the countdown AND the absolute deadline. The countdown alone
          decays while the reader looks at it, so the exact date is shown
          alongside it. */}
      {detail.expiredDate && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Time Remaining</span>
          <span className="text-sm">
            {formatRemainingTime(detail.expiredDate)}
          </span>
          {formatAbsoluteDate(detail.expiredDate) && (
            <span className="text-xs text-muted-foreground">
              Expires {formatAbsoluteDate(detail.expiredDate)}
            </span>
          )}
        </div>
      )}

      {/* Last modified */}
      {detail.lastModified && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Last Modified</span>
          <span className="text-sm">
            {new Date(detail.lastModified).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  )
}
