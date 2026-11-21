'use client'
// ---------------------------------------------------------------------------
// _components/classes-table.tsx
// DataTable rendering ClassItem[] rows with inline actions
// Pattern: client-side table — receives pre-paginated items from useClientTable
// ---------------------------------------------------------------------------

import { useRouter } from '@/features/lms/classes/navigation'
import {
  Calendar,
  Clock,
  BarChart3,
  CalendarRange,
  Users,
  Pencil,
  Trash2,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatDate, formatTime } from '@/lib/format-date'
import { shortenName } from '@/lib/utils'
import { usePermission } from '@/features/lms/classes/temp-permissions'
import { PERMISSIONS } from '@/features/lms/classes/temp-permissions'
import type { ClassItem, ClassTeacherInfo } from '@/features/lms/types/class'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const

// ---------------------------------------------------------------------------
// Teacher display helpers
// ---------------------------------------------------------------------------

/**
 * Format teacher name for table display.
 * - 1 teacher: "H.N.Đ.N. (mt)" (shortened name + badge)
 * - 2+ teachers: each on separate line with MT/CT badge
 * Note: englishName prefix requires backend to include it in teachers string
 */
function formatTeacherCell(teachers: ClassTeacherInfo[]): React.ReactNode {
  if (teachers.length === 0) {
    return <span className="text-xs text-muted-foreground/50">—</span>
  }

  return (
    <div className="flex flex-col gap-1">
      {teachers.map((t, i) => {
        const shortName = shortenName(t.name)
        const label = t.isPrimary ? 'mt' : 'ct'
        return (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-xs truncate" title={t.name}>
              {t.englishName
                ? `${t.englishName} - ${shortName}`
                : shortName}
            </span>
            <Badge
              className={`text-[9px] px-1 py-0 font-bold uppercase border-0 flex-shrink-0 ${
                t.isPrimary
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {label}
            </Badge>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ClassesTableProps {
  items: ClassItem[]
  totalFiltered: number
  isLoading: boolean
  onEdit?: (item: ClassItem) => void
  onDelete?: (item: ClassItem) => void
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

export function ClassesTable({
  items,
  totalFiltered,
  isLoading,
  onEdit,
  onDelete,
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
}: ClassesTableProps) {
  const router = useRouter()
  const { can } = usePermission()
  const canEdit = can(PERMISSIONS.CLASS_UPDATE)
  const canDelete = can(PERMISSIONS.CLASS_DELETE)

  if (isLoading) return <TableSkeleton />

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-50 inline-block" />
    return sortDesc ? <ArrowDown className="ml-2 h-3 w-3 inline-block" /> : <ArrowUp className="ml-2 h-3 w-3 inline-block" />
  }

  const renderSortableHead = (label: string, field: string, className?: string) => {
    const isCentered = className?.includes('text-center')
    return (
      <TableHead
        className={`cursor-pointer hover:text-primary transition-colors select-none ${className || ''}`}
        onClick={() => onSortChange?.(field)}
      >
        <div className={`flex items-center ${isCentered ? 'justify-center' : ''}`}>
          {label}
          <SortIcon field={field} />
        </div>
      </TableHead>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Table body ── */}
      <div className="flex-1 overflow-auto">
        <Table className="table-fixed w-full">
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow className="hover:bg-transparent h-10">
              {renderSortableHead('Level / Name', 'className', 'w-[16%]')}
              <TableHead className="hidden lg:table-cell w-[14%]">Description</TableHead>
              {renderSortableHead('Schedule', 'scheduleDays', 'w-[14%]')}
              <TableHead className="w-[9%]">Time</TableHead>
              {renderSortableHead('Teachers', 'teacherNames', 'w-[16%]')}
              {renderSortableHead('Students', 'studentCount', 'w-[7%] text-center')}
              {renderSortableHead('Prog.', 'remainingDays', 'w-[7%] text-center')}
              <TableHead className="text-right w-[17%]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-10 text-sm text-muted-foreground"
                >
                  No classes found
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-muted/50 h-12"
                  onClick={() => router.push(`/classes/${item.id}`)}
                >
                  {/* Level / Name */}
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium truncate">
                        {item.className}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.levelName}
                      </p>
                    </div>
                  </TableCell>

                  {/* Description */}
                  <TableCell className="hidden lg:table-cell">
                    {item.description ? (
                      <span className="text-xs text-muted-foreground truncate block">
                        {item.description}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </TableCell>

                  {/* Schedule */}
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1.5 text-xs">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {item.scheduleDays || '—'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {item.startDate && item.endDate
                          ? `${formatDate(item.startDate)} – ${formatDate(item.endDate)}`
                          : '—'}
                      </span>
                    </div>
                  </TableCell>

                  {/* Time */}
                  <TableCell>
                    {item.startTime && item.endTime ? (
                      <span className="flex items-center gap-1.5 text-xs">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {formatTime(item.startTime)} – {formatTime(item.endTime)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </TableCell>

                  {/* Teachers */}
                  <TableCell>
                    {formatTeacherCell(item.teachers)}
                  </TableCell>

                  {/* Students */}
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] px-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold tabular-nums">
                      {item.studentCount}
                    </span>
                  </TableCell>

                  {/* Progress */}
                  <TableCell className="text-center">
                    <span className="text-xs font-medium tabular-nums">{item.remainingDays}</span>
                    <span className="block text-[10px] text-muted-foreground">days</span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" disabled aria-label="Class Report" onClick={(e) => e.stopPropagation()}>
                            <BarChart3 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Class Report</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 hover:bg-primary/10 hover:text-primary" 
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/timetable?classId=${item.id}&returnTo=/classes`)
                            }}
                            aria-label={`Timetable of ${item.className}`}
                          >
                            <CalendarRange className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Timetable of Class</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 hover:bg-primary/10 hover:text-primary" 
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/classes/${item.id}`)
                            }}
                            aria-label={`View details of ${item.className}`}
                          >
                            <Users className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Class Details</TooltipContent>
                      </Tooltip>

                      {(canEdit || canDelete) && (
                        <Separator orientation="vertical" className="h-4 mx-0.5" />
                      )}

                      {canEdit && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
                              onClick={(e) => {
                                e.stopPropagation()
                                onEdit?.(item)
                              }}
                              aria-label={`Edit ${item.className}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Class</TooltipContent>
                        </Tooltip>
                      )}

                      {canDelete && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                onDelete?.(item)
                              }}
                              aria-label={`Delete ${item.className}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete Class</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
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

// ---------------------------------------------------------------------------
// Skeleton — extracted as separate component
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        <Table className="table-fixed w-full">
          <TableHeader>
            <TableRow className="h-10">
              <TableHead className="w-[16%]">Level / Name</TableHead>
              <TableHead className="hidden lg:table-cell w-[14%]">Description</TableHead>
              <TableHead className="w-[14%]">Schedule</TableHead>
              <TableHead className="w-[9%]">Time</TableHead>
              <TableHead className="w-[16%]">Teachers</TableHead>
              <TableHead className="w-[7%] text-center">Students</TableHead>
              <TableHead className="w-[7%] text-center">Prog.</TableHead>
              <TableHead className="text-right w-[17%]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i} className="h-12">
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-1 h-3 w-16" />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-28" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="h-6 w-6 mx-auto rounded-full" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="h-4 w-8 mx-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-7 w-36 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {/* Skeleton footer */}
      <div className="shrink-0 border-t px-4 py-2 flex justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-48" />
      </div>
    </div>
  )
}
