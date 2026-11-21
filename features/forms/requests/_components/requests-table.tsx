'use client'
// ---------------------------------------------------------------------------
// requests-table.tsx — Inbox data table with sortable columns + pagination
//
// The table is a PURE VIEW of one server page: it never partitions, counts or
// re-sorts the rows it is given. Sorting is owned by the page shell (which
// also owns the localStorage-backed sort choice and turns it into the
// server's `sort` clause), so the header arrows and the fetched page can
// never disagree.
//
// COLUMNS. Nine, in this order: `#` (short request id), Subject, Template,
// Creator, Created, Remaining, Status, Next Action, Actions. `#` shows the
// short id — not the row ordinal — so a request can be quoted from the inbox
// and found in the detail page.
//
// ROW ACTIONS. Hide/Unhide is offered on the CREATED tab only: that tab is
// filtered to the caller's own requests server-side, so the caller is the
// creator and therefore the only person allowed to archive them.
// ---------------------------------------------------------------------------

import {
  Archive,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SortHeader } from '@/components/ui/sort-header'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { RequestListItem, RequestTab } from '@/features/lms/types/request'
import type { SortConfig } from '@/hooks/use-sort'
import { useSetRequestArchived } from '@/features/lms/hooks/requests/use-request-mutations'
import { getErrorDetail } from '@/features/lms/lib/requests/api'
import { REQUEST_PAGE_SIZE_OPTIONS } from '@/features/lms/lib/requests/constants'
import type { RequestSortColumn } from '@/features/lms/lib/requests/sorting'
import { formatRemainingTime } from '@/features/lms/lib/requests/time'

import { RequestStatusBadge } from './request-status-badge'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The table renders nine columns — every empty/error row must span them all. */
const COLUMN_COUNT = 9

interface RequestsTableProps {
  items: RequestListItem[]
  isLoading: boolean
  /** The inbox query failed — the page renders an error row instead of rows. */
  isError?: boolean
  error?: unknown
  totalFiltered: number
  page: number
  pageSize: number
  totalPages: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onViewRequest: (id: string) => void
  /** The active inbox tab — decides whether the archive row action is offered. */
  tab: RequestTab
  /** The sort choice, owned by the page shell. */
  sortConfig: SortConfig<RequestSortColumn>
  onSort: (column: RequestSortColumn) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

/**
 * The short request id shown in the `#` column.
 *
 * The full id is a GUID: it is the concurrency key in the URL and far too
 * wide for a table cell, but the first 8 characters are enough to tell two
 * requests apart and to match what an approver says out loud.
 */
export function shortRequestId(id: string): string {
  return `#${id.slice(0, 8)}`
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden p-4 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-4 flex-1 max-w-[200px] rounded" />
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-5 w-16 rounded" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between px-4 py-2 border-t shrink-0 bg-card/80">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-48" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main table
// ---------------------------------------------------------------------------

export function RequestsTable({
  items,
  isLoading,
  isError,
  error,
  totalFiltered,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  onViewRequest,
  tab,
  sortConfig,
  onSort,
}: RequestsTableProps) {
  const archiveMutation = useSetRequestArchived()

  const handleArchiveToggle = async (item: RequestListItem) => {
    try {
      await archiveMutation.mutateAsync({
        id: item.id,
        input: { archived: !item.isArchived },
        // The row's CURRENT token — the list read is the only place the
        // caller can obtain it, and a stale one would 409 the archive.
        updatedAt: item.updatedAt,
      })
      toast.success(item.isArchived ? 'Request unhidden.' : 'Request hidden.')
    } catch (err) {
      toast.error(getErrorDetail(err, 'Could not update the request visibility.'))
    }
  }

  if (isLoading) {
    return <TableSkeleton />
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <ScrollArea className="flex-1 min-h-0 w-full">
        <Table className="w-full table-fixed">
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[90px] text-xs">#</TableHead>
              <TableHead className="text-xs">
                <SortHeader
                  column="subject"
                  label="Subject"
                  currentSort={sortConfig}
                  onSort={onSort}
                />
              </TableHead>
              <TableHead className="w-[150px] text-xs">Template</TableHead>
              <TableHead className="w-[120px] text-xs">Creator</TableHead>
              <TableHead className="w-[110px] text-xs">
                <SortHeader
                  column="createdDate"
                  label="Created"
                  currentSort={sortConfig}
                  onSort={onSort}
                />
              </TableHead>
              <TableHead className="w-[120px] text-xs">Remaining</TableHead>
              <TableHead className="w-[100px] text-xs">Status</TableHead>
              <TableHead className="w-[130px] text-xs">Next Action</TableHead>
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Error state — the query failed; there is no page to show. */}
            {isError && (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} className="h-40">
                  <div
                    role="alert"
                    className="flex flex-col items-center justify-center gap-2 text-muted-foreground"
                  >
                    <p className="text-sm font-medium text-destructive">
                      Could not load requests
                    </p>
                    <p className="text-xs">
                      {getErrorDetail(error, 'Please try again in a moment.')}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Empty state */}
            {!isError && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} className="h-48">
                  <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <FileText className="h-12 w-12 opacity-30" />
                    <p className="text-sm font-medium">No requests found</p>
                    <p className="text-xs">Try adjusting your search or filter criteria.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!isError &&
              items.map((item) => {
                const remaining = formatRemainingTime(item.expiredDate)

                return (
                  <TableRow
                    key={item.id}
                    className="group cursor-pointer"
                    onClick={() => onViewRequest(item.id)}
                  >
                    {/* # — short request id */}
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      <span title={item.id}>{shortRequestId(item.id)}</span>
                    </TableCell>

                    {/* Subject */}
                    <TableCell>
                      <p
                        className="text-sm font-medium leading-tight truncate"
                        title={item.subject || undefined}
                      >
                        {item.subject || (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </p>
                      {item.collectionName && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {item.collectionName}
                        </p>
                      )}
                    </TableCell>

                    {/* Template */}
                    <TableCell className="text-xs text-muted-foreground truncate">
                      {item.templateName || '—'}
                    </TableCell>

                    {/* Creator */}
                    <TableCell className="text-xs text-muted-foreground truncate">
                      {item.createdByName || '—'}
                    </TableCell>

                    {/* Created date */}
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {formatDate(item.createdDate)}
                    </TableCell>

                    {/* Remaining time — a countdown, so it decays while read. */}
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {remaining ?? <span className="text-muted-foreground/50">—</span>}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <RequestStatusBadge
                        status={item.formStatus as import('@/features/lms/types/request').RequestFormStatusValue}
                      />
                    </TableCell>

                    {/* Next action */}
                    <TableCell className="text-xs text-muted-foreground">
                      {item.currentStepName ? (
                        <span className="truncate block max-w-[120px]" title={item.currentStepName}>
                          {item.currentStepName}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <TooltipProvider>
                          {tab === 'created' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
                                  disabled={archiveMutation.isPending}
                                  onClick={() => handleArchiveToggle(item)}
                                  aria-label={
                                    item.isArchived
                                      ? 'Unhide request'
                                      : 'Hide request'
                                  }
                                >
                                  {item.isArchived ? (
                                    <ArchiveRestore className="h-3.5 w-3.5" />
                                  ) : (
                                    <Archive className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {item.isArchived ? 'Unhide' : 'Hide'}
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
                                onClick={() => onViewRequest(item.id)}
                                aria-label="View request"
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Pagination footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t shrink-0 bg-card/80 backdrop-blur-sm">
        <span className="text-xs text-muted-foreground">
          <span className="tabular-nums font-medium text-foreground">
            {Math.min((page - 1) * pageSize + 1, totalFiltered)}–
            {Math.min(page * pageSize, totalFiltered)}
          </span>{' '}
          of{' '}
          <span className="tabular-nums font-medium text-foreground">{totalFiltered}</span>{' '}
          requests
        </span>

        <div className="flex items-center gap-3">
          {/* Rows per page */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Rows</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange(Number(v))}
            >
              <SelectTrigger className="h-7 w-[60px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REQUEST_PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Page indicator */}
          <span className="text-xs text-muted-foreground tabular-nums">
            Page {page} of {totalPages}
          </span>

          {/* 4-button pagination */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={page <= 1}
              onClick={() => onPageChange(1)}
              aria-label="First page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages}
              onClick={() => onPageChange(totalPages)}
              aria-label="Last page"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
