'use client'
// ---------------------------------------------------------------------------
// _components/schedule-table.tsx
// Data table for schedule list — Shadcn Table with inline row actions
// Pattern: client-side table — receives pre-paginated items from useClientTable
// ---------------------------------------------------------------------------

import { AlertCircle, Calendar, Pencil, Trash2, BookOpen, DoorOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatDate, formatTime } from '@/lib/format-date'
import { usePermission } from '@/components/auth/permission-guard'
import { PERMISSIONS } from '@/lib/permissions'
import type { Schedule } from '@/features/lms/types/schedule'
import { getActiveDays } from '@/features/lms/types/schedule'
import { ScheduleEmptyState } from './schedule-empty-state'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ScheduleTableProps {
  items: Schedule[]
  totalFiltered: number
  isLoading: boolean
  onEdit: (schedule: Schedule) => void
  onDelete: (schedule: Schedule) => void
  onAssignClass: (schedule: Schedule) => void
  onAssignRoom: (schedule: Schedule) => void
  onViewCalendar?: (schedule: Schedule) => void
  page: number
  pageSize: number
  totalPages: number
  rangeStart: number
  rangeEnd: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  sortField?: string
  sortDesc?: boolean
  onSortChange?: (field: string) => void
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScheduleTable({
  items,
  totalFiltered,
  isLoading,
  onEdit,
  onDelete,
  onAssignClass,
  onAssignRoom,
  onViewCalendar,
  page,
  pageSize,
  totalPages,
  rangeStart,
  rangeEnd,
  onPageChange,
  onPageSizeChange,
  sortField,
  sortDesc,
  onSortChange,
}: ScheduleTableProps) {
  const { can } = usePermission()
  const canManageSchedule = can(PERMISSIONS.CLASS_SCHEDULE)

  if (isLoading) return <TableSkeleton />
  if (items.length === 0 && totalFiltered === 0) return <ScheduleEmptyState />

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-50 inline-block" />
    return sortDesc ? <ArrowDown className="ml-2 h-3 w-3 inline-block" /> : <ArrowUp className="ml-2 h-3 w-3 inline-block" />
  }

  const renderSortableHead = (label: string, field: string, className?: string) => (
    <TableHead
      className={`cursor-pointer hover:text-primary transition-colors select-none ${className || ''}`}
      onClick={() => onSortChange?.(field)}
    >
      <div className="flex items-center">
        {label}
        <SortIcon field={field} />
      </div>
    </TableHead>
  )

  return (
    <div className="flex flex-col h-full">
      {/* ── Table body ── */}
      <div className="flex-1 overflow-auto">
      <Table className="table-fixed w-full">
        <TableHeader className="sticky top-0 bg-card z-10">
          <TableRow className="hover:bg-transparent h-10">
            {renderSortableHead('Name', 'name', 'w-[14%]')}
            {renderSortableHead('Start Date', 'startDate', 'w-[10%]')}
            {renderSortableHead('End Date', 'endDate', 'w-[10%]')}
            <TableHead className="w-[12%]">Schedule</TableHead>
            {renderSortableHead('Start Time', 'startTime', 'w-[8%]')}
            {renderSortableHead('End Time', 'endTime', 'w-[8%]')}
            <TableHead className="w-[10%]">Room</TableHead>
            <TableHead className="w-[12%]">Class</TableHead>
            <TableHead className="w-[10%]">Campus</TableHead>
            <TableHead className="w-[6%] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((schedule) => {
            const isUnscheduled = !schedule.classCourseId
            const days = getActiveDays(schedule)

            return (
              <TableRow
                key={schedule.id}
                className={cn(
                  'group h-12',
                  isUnscheduled && 'bg-orange-50/60 dark:bg-orange-950/20',
                )}
              >
                {/* Name */}
                <TableCell className="font-medium text-sm truncate">
                  {schedule.name}
                </TableCell>

                {/* Start Date */}
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(schedule.startDate)}
                </TableCell>

                {/* End Date */}
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(schedule.endDate)}
                </TableCell>

                {/* Schedule (day badges) */}
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {days.length > 0 ? (
                      days.map((day) => (
                        <Badge
                          key={day}
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {day}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        {schedule.scheduleFormat || 'N/A'}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Start Time */}
                <TableCell className="text-xs text-muted-foreground">
                  {formatTime(schedule.startTime)}
                </TableCell>

                {/* End Time */}
                <TableCell className="text-xs text-muted-foreground">
                  {formatTime(schedule.endTime)}
                </TableCell>

                {/* Room */}
                <TableCell className="text-xs text-muted-foreground truncate">
                  {schedule.classRoomName ?? (
                    <span className="italic">No room</span>
                  )}
                </TableCell>

                {/* Class */}
                <TableCell>
                  {schedule.classCourseName ? (
                    <span className="text-xs truncate block">{schedule.classCourseName}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 italic">
                      <AlertCircle className="h-3 w-3" />
                      Unscheduled
                    </span>
                  )}
                </TableCell>

                {/* Campus */}
                <TableCell className="text-xs text-muted-foreground truncate">
                  {schedule.campusName ?? '—'}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* View Calendar */}
                    {onViewCalendar && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onViewCalendar(schedule)}
                          >
                            <Calendar className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Calendar</TooltipContent>
                      </Tooltip>
                    )}

                    {canManageSchedule && (
                      <>
                        {/* Set Class */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                'h-7 w-7',
                                isUnscheduled &&
                                  'text-orange-600 dark:text-orange-400 animate-pulse',
                              )}
                              onClick={() => onAssignClass(schedule)}
                            >
                              <BookOpen className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Set Class</TooltipContent>
                        </Tooltip>

                        {/* Set Room */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onAssignRoom(schedule)}
                            >
                              <DoorOpen className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Set Room</TooltipContent>
                        </Tooltip>

                        <Separator orientation="vertical" className="mx-0.5 h-4" />

                        {/* Edit */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onEdit(schedule)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>

                        {/* Delete */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => onDelete(schedule)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      </div>

      {/* ── Sticky Footer: summary + pagination ── */}
      <div className="shrink-0 border-t bg-card/80 backdrop-blur-sm px-4 py-2 flex items-center justify-between gap-4">
        {/* Left: summary info */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-medium tabular-nums">
            {totalFiltered === 0
              ? 'No items'
              : `${rangeStart}–${rangeEnd} of ${totalFiltered} items`}
          </span>
        </div>

        {/* Right: page size + navigation */}
        <div className="flex items-center gap-3">
          {/* Page size selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Rows
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange(Number(v))}
            >
              <SelectTrigger className="h-7 w-[60px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)} className="text-xs">
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Page info */}
          <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap min-w-[80px] text-center">
            Page {page} of {totalPages}
          </span>

          {/* Navigation buttons */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPageChange(1)}
              disabled={page <= 1}
              aria-label="First page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPageChange(totalPages)}
              disabled={page >= totalPages}
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
