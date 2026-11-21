'use client'
// ---------------------------------------------------------------------------
// _components/students-table.tsx
// Students data table — design system compliant (03-design-system.md)
// Pattern: canonical table from material-table.tsx
// ---------------------------------------------------------------------------

import { useMemo, useState, useCallback } from 'react'
import {
  FileText,
  RefreshCw,
  Clock,
  Users,
  Cake,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  EyeOff,
} from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
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
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { SortHeader } from '@/components/ui/sort-header'

import {
  deriveStudentStatus,
  getStatusBadgeConfig,
  formatStudentDate,
  type StudentAllItem,
} from '@/features/lms/types/student'
import { cn } from '@/lib/utils'
import { shortenName } from './student-utils'
import { useSort, sortWithBirthdayPriority } from '@/hooks/use-sort'

// ---------------------------------------------------------------------------
// Sort configuration
// ---------------------------------------------------------------------------

type StudentSortColumn = 'name' | 'englishName' | 'birthday' | 'startDate' | null

const STUDENT_SORT_STORAGE_KEY = 'students-table-sort'

// ---------------------------------------------------------------------------
// Birthday helpers
// ---------------------------------------------------------------------------

/**
 * Check if a student's birthday is today (same month + day, any year).
 * Handles both ISO format and dd/MM/yyyy backend format.
 */
function checkBirthdayString(birthday: string | null): boolean {
  if (!birthday) return false
  const today = new Date()
  const todayMonth = today.getMonth() // 0-indexed
  const todayDay = today.getDate()

  // Try dd/MM/yyyy format first (e.g. "15/08/2017")
  const ddMM = birthday.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (ddMM) {
    const day = parseInt(ddMM[1], 10)
    const month = parseInt(ddMM[2], 10) - 1 // convert to 0-indexed
    return month === todayMonth && day === todayDay
  }

  // Fallback: ISO / parseable date
  try {
    const d = new Date(birthday)
    if (isNaN(d.getTime())) return false
    return d.getMonth() === todayMonth && d.getDate() === todayDay
  } catch {
    return false
  }
}

/**
 * Also check birthdayFormat ("dd/MM/yyyy") which backend pre-formats.
 */
function isStudentBirthdayToday(student: StudentAllItem): boolean {
  return checkBirthdayString(student.birthday)
}

// ---------------------------------------------------------------------------
// Constants (design system standard)
// ---------------------------------------------------------------------------

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const
const COLUMN_COUNT = 10

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StudentsTableProps {
  students: StudentAllItem[]
  isLoading: boolean
  totalFiltered: number
  page: number
  pageSize: number
  totalPages: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onViewInfo: (id: string) => void
  onRenew: (id: string) => void
  onReserve: (id: string) => void
  /** Whether the caller has `student.update` (controls Renew/Reserve visibility) */
  canUpdateStudent: boolean
  /** Whether showing inactive (suspended/terminated) students */
  isInactiveTab?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StudentsTable({
  students,
  isLoading,
  totalFiltered,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  onViewInfo,
  onRenew,
  onReserve,
  canUpdateStudent,
  isInactiveTab = false,
}: StudentsTableProps) {
  // ── Sort state with localStorage persistence ─────────────────────────
  const { sortConfig, toggleSort } = useSort<NonNullable<StudentSortColumn>>(
    STUDENT_SORT_STORAGE_KEY,
    null
  )

  // ── Phone visibility toggle ───────────────────────────────────────────
  const [showPhones, setShowPhones] = useState(false)

  const togglePhones = useCallback(() => {
    setShowPhones((prev) => !prev)
  }, [])

  // ── Sort: birthday-today students float to top when no column sort is active ────
  const sortedStudents = useMemo(() => {
    // Inactive tab: no sorting
    if (isInactiveTab) return students

    // Helper to check birthday today
    const checkBirthdayToday = (student: StudentAllItem) =>
      checkBirthdayString(student.birthday)

    // Build sortable wrapper with isBirthdayToday method
    const sortableStudents = students.map(s => ({
      ...s,
      isBirthdayToday: () => checkBirthdayToday(s)
    }))

    // Sort function based on column
    const sortFn = (a: StudentAllItem & { isBirthdayToday: () => boolean }, b: StudentAllItem & { isBirthdayToday: () => boolean }) => {
      let aVal = ''
      let bVal = ''

      switch (sortConfig.column) {
        case 'name':
          aVal = a.studentName || ''
          bVal = b.studentName || ''
          break
        case 'englishName':
          aVal = a.englishName || ''
          bVal = b.englishName || ''
          break
        case 'birthday':
          aVal = a.birthday || ''
          bVal = b.birthday || ''
          break
        case 'startDate':
          aVal = a.beginDate || ''
          bVal = b.beginDate || ''
          break
        default:
          return 0
      }

      const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' })
      return sortConfig.direction === 'asc' ? cmp : -cmp
    }

    return sortWithBirthdayPriority(sortableStudents, sortConfig.column, sortFn)
  }, [students, isInactiveTab, sortConfig])

  // ── Loading state — delegate to TableSkeleton ──────────────────────
  if (isLoading) {
    return <TableSkeleton />
  }

  // ── Data table ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <ScrollArea className="flex-1 min-h-0 w-full">
        <Table className="w-full table-fixed">
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[45px] text-xs">#</TableHead>
              <TableHead className="w-[150px] text-xs">
                <SortHeader
                  column="name"
                  label="Name"
                  currentSort={sortConfig}
                  onSort={toggleSort}
                />
              </TableHead>
              <TableHead className="w-[130px] text-xs">
                <SortHeader
                  column="englishName"
                  label="English Name"
                  currentSort={sortConfig}
                  onSort={toggleSort}
                />
              </TableHead>
              <TableHead className="w-[85px] text-xs">
                <SortHeader
                  column="birthday"
                  label="Birthday"
                  currentSort={sortConfig}
                  onSort={toggleSort}
                />
              </TableHead>
              <TableHead className="w-[140px] text-xs">Father</TableHead>
              <TableHead className="w-[140px] text-xs">Mother</TableHead>
              <TableHead className="w-[180px] text-xs">Address</TableHead>
              <TableHead className="w-[100px] text-xs">
                <SortHeader
                  column="startDate"
                  label={isInactiveTab ? 'Updated Date' : 'Start Date'}
                  currentSort={sortConfig}
                  onSort={toggleSort}
                />
              </TableHead>
              <TableHead className="w-[70px] text-xs">Status</TableHead>
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Empty state — inline colSpan row (design system) */}
            {sortedStudents.length === 0 && (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} className="h-48">
                  <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <Users className="h-12 w-12 opacity-30" />
                    <p className="text-sm font-medium">No students found</p>
                    <p className="text-xs">Try adjusting your search or filter criteria.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {sortedStudents.map((student, idx) => {
              const status = deriveStudentStatus(student)
              const badge = getStatusBadgeConfig(status)
              const rowIndex = (page - 1) * pageSize + idx + 1
              const hasBirthdayToday = !isInactiveTab && isStudentBirthdayToday(student)

              return (
                <TableRow
                  key={student.id}
                  className={cn(
                    'group',
                    status !== 'Active' && 'opacity-70',
                    hasBirthdayToday && 'bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-50/80 dark:hover:bg-amber-950/30',
                  )}
                >
                  {/* # */}
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {hasBirthdayToday ? (
                      <span className="text-amber-500" aria-label="Birthday today">🎂</span>
                    ) : (
                      rowIndex
                    )}
                  </TableCell>

                  {/* Name */}
                  <TableCell>
                    <p className="text-sm font-medium leading-tight truncate" title={student.studentName || undefined}>
                      {student.studentName ? shortenName(student.studentName) : <span className="text-xs text-muted-foreground/50">—</span>}
                    </p>
                  </TableCell>

                  {/* English Name */}
                  <TableCell className="text-xs text-muted-foreground truncate" title={student.englishName || undefined}>
                    {student.englishName || <span className="text-muted-foreground/50">—</span>}
                  </TableCell>

                  {/* Birthday — special design for today's birthday */}
                  <TableCell className="text-xs tabular-nums">
                    {hasBirthdayToday ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                              <Cake className="size-3.5 animate-bounce" style={{ animationDuration: '2s' }} />
                              {formatStudentDate(student.birthday)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="bg-amber-500 text-white border-amber-500">
                            <p className="text-xs font-medium">🎉 Happy Birthday!</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-muted-foreground">
                        {formatStudentDate(student.birthday)}
                      </span>
                    )}
                  </TableCell>

                  {/* Father */}
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs font-medium truncate max-w-[150px]">
                        {student.fatherName || <span className="text-muted-foreground/50">—</span>}
                      </p>
                      {student.fatherPhone && (
                        <p className="text-xs font-mono tabular-nums">
                          {showPhones ? student.fatherPhone : '••••••••'}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  {/* Mother */}
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs font-medium truncate max-w-[150px]">
                        {student.motherName || <span className="text-muted-foreground/50">—</span>}
                      </p>
                      {student.motherPhone && (
                        <p className="text-xs font-mono tabular-nums">
                          {showPhones ? student.motherPhone : '••••••••'}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  {/* Address */}
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs text-muted-foreground line-clamp-2 block cursor-default" title={student.address || undefined}>
                            {student.address || <span className="text-muted-foreground/50">—</span>}
                          </span>
                        </TooltipTrigger>
                        {student.address && (
                          <TooltipContent side="bottom" className="max-w-xs">
                            <p className="text-xs">{student.address}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>

                  {/* Date — contextual: Start Date (active) / Suspend+End Date (inactive) */}
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {isInactiveTab ? (
                      <div className="flex flex-col gap-0.5">
                        {student.suspendDate && (
                          <p className="text-amber-600 dark:text-amber-400">
                            S: {formatStudentDate(student.suspendDate)}
                          </p>
                        )}
                        {student.terminateDate && (
                          <p className="text-rose-600 dark:text-rose-400">
                            T: {formatStudentDate(student.terminateDate)}
                          </p>
                        )}
                        {!student.suspendDate && !student.terminateDate && (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </div>
                    ) : (
                      formatStudentDate(student.beginDate)
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] font-medium', badge.className)}
                    >
                      {badge.label}
                    </Badge>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
                              onClick={() => onViewInfo(student.id)}
                              aria-label="View student info"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View Info</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {canUpdateStudent && (
                        <>
                          <Separator orientation="vertical" className="h-4 mx-0.5" />
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => onRenew(student.id)}
                                  aria-label="Renew student"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Renew</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => onReserve(student.id)}
                                  aria-label="Reserve student"
                                >
                                  <Clock className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Reserve</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* ── Pagination Footer (design system: frosted glass) ─────── */}
      <div className="flex items-center justify-between px-4 py-2 border-t shrink-0 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {/* Phone visibility toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 gap-1.5 text-xs"
                  onClick={togglePhones}
                >
                  {showPhones ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" />
                      Hide Phones
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      Show Phones
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{showPhones ? 'Hide parent phone numbers' : 'Show parent phone numbers'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <span className="text-xs text-muted-foreground">
            <span className="tabular-nums font-medium text-foreground">
              {Math.min((page - 1) * pageSize + 1, totalFiltered)}–
              {Math.min(page * pageSize, totalFiltered)}
            </span>{' '}
            of{' '}
            <span className="tabular-nums font-medium text-foreground">{totalFiltered}</span>{' '}
            students
          </span>
        </div>

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
                {PAGE_SIZE_OPTIONS.map((size) => (
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

          {/* 4-button pagination: First / Prev / Next / Last */}
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

// ---------------------------------------------------------------------------
// TableSkeleton — separate function (design system requirement)
// 8 rows mirroring column layout, with footer skeleton
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden p-4 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-8 rounded" />
            <Skeleton className="h-4 w-36 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-4 w-14 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
          </div>
        ))}
      </div>
      {/* Footer skeleton */}
      <div className="flex items-center justify-between px-4 py-2 border-t shrink-0 bg-card/80">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-48" />
      </div>
    </div>
  )
}
