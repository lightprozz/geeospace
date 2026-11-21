'use client'
// ---------------------------------------------------------------------------
// _components/class-students-tab.tsx
// Students tab for Class Detail — active + suspended/terminated roster
// Design: matches students-table.tsx pattern (ScrollArea, sticky header,
// birthday highlight, frosted footer, TableSkeleton)
// ---------------------------------------------------------------------------

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from '@/features/lms/classes/navigation'
import {
  AlertTriangle,
  Cake,
  FileText,
  Search,
  Trash2,
  UserMinus,
  Users,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  useClassStudents,
  useSuspendedStudents,
  useStudentSessionStats,
} from '@/features/lms/hooks/classes/use-classes'
import {
  formatStudentDate,
  getStatusBadgeConfig,
  CLASS_TYPE,
} from '@/features/lms/types/student'
import type { ClassStudentGrid } from '@/features/lms/types/class-student'
import { cn, shortenName } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Birthday helper
// ---------------------------------------------------------------------------

/** Check if a birthday is today (same day+month, any year) */
function isBirthdayToday(birthday: string | null): boolean {
  if (!birthday) return false
  const today = new Date()
  const todayMonth = today.getMonth()
  const todayDay = today.getDate()

  // Try dd/MM/yyyy format first
  const ddMM = birthday.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (ddMM) {
    const day = parseInt(ddMM[1], 10)
    const month = parseInt(ddMM[2], 10) - 1
    return month === todayMonth && day === todayDay
  }

  // Fallback: ISO
  try {
    const d = new Date(birthday)
    if (isNaN(d.getTime())) return false
    return d.getMonth() === todayMonth && d.getDate() === todayDay
  } catch {
    return false
  }
}

function isStudentBirthdayToday(s: ClassStudentGrid): boolean {
  return isBirthdayToday(s.birthdayFormat) || isBirthdayToday(s.birthday)
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

function getStudentStatusLabel(
  studentType: number,
): 'Active' | 'Suspended' | 'Terminated' {
  if (studentType === CLASS_TYPE.Suspended) return 'Suspended'
  if (studentType === CLASS_TYPE.Terminated) return 'Terminated'
  return 'Active'
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLUMN_COUNT = 9
const LOW_SESSIONS_THRESHOLD = 12

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ClassStudentsTabProps {
  classId: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ClassStudentsTab({ classId }: ClassStudentsTabProps) {
  const router = useRouter()
  const [activeList, setActiveList] = useState<'current' | 'studied'>('current')
  const [searchQuery, setSearchQuery] = useState('')

  // ── Data ───────────────────────────────────────────────────────────────
  const {
    data: activeStudents,
    isLoading: loadingActive,
    error: errorActive,
  } = useClassStudents(classId)

  const {
    data: suspendedStudents,
    isLoading: loadingSuspended,
    error: errorSuspended,
  } = useSuspendedStudents(classId)

  const { data: sessionStats } = useStudentSessionStats(classId)

  // Build lookup: Student.Id → remainSessions
  const sessionMap = useMemo(() => {
    const map = new Map<string, number>()
    sessionStats?.forEach((s) => map.set(s.studentId, s.remainSessions))
    return map
  }, [sessionStats])

  const isStudied = activeList === 'studied'
  const isLoading = isStudied ? loadingSuspended : loadingActive
  const rawList = isStudied ? suspendedStudents : activeStudents

  // ── Filtered + sorted ────────────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    if (!rawList) return []
    let list = rawList
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (s) =>
          (s.studentName ?? '').toLowerCase().includes(q) ||
          (s.englishName ?? '').toLowerCase().includes(q) ||
          (s.fatherPhone ?? '').includes(q) ||
          (s.motherPhone ?? '').includes(q),
      )
    }
    // Float birthday-today rows to top (active tab only)
    if (!isStudied) {
      return [...list].sort((a, b) => {
        const aBday = isStudentBirthdayToday(a) ? 0 : 1
        const bBday = isStudentBirthdayToday(b) ? 0 : 1
        return aBday - bBday
      })
    }
    return list
  }, [rawList, searchQuery, isStudied])

  // ── Counts ────────────────────────────────────────────────────────────
  const currentCount = activeStudents?.length ?? 0
  const studiedCount = suspendedStudents?.length ?? 0

  // ── Action handlers ────────────────────────────────────────────────────
  const handleViewInfo = useCallback(
    (student: ClassStudentGrid) => {
      router.push(`/students/${student.studentId}`)
    },
    [router],
  )

  const handleChangeStatus = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 pt-1 pb-1 border-b shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        {/* List toggle */}
        <div className="flex p-1 bg-muted/60 rounded-lg">
          <button
            onClick={() => setActiveList('current')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
              activeList === 'current'
                ? 'bg-background text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Current ({currentCount})
          </button>
          <button
            onClick={() => setActiveList('studied')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
              activeList === 'studied'
                ? 'bg-background text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Studied ({studiedCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 pr-8 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton />
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[50px] text-xs">#</TableHead>
                <TableHead className="text-xs min-w-[160px]">Name</TableHead>
                <TableHead className="text-xs min-w-[110px]">English Name</TableHead>
                <TableHead className="text-xs min-w-[90px]">Birthday</TableHead>
                <TableHead className="text-xs min-w-[160px]">Father</TableHead>
                <TableHead className="text-xs min-w-[160px]">Mother</TableHead>
                <TableHead className="text-xs min-w-[90px] text-center">
                  Sessions
                </TableHead>
                <TableHead className="text-xs min-w-[80px]">
                  {isStudied ? 'Status' : 'Type'}
                </TableHead>
                <TableHead className="text-xs min-w-[100px] text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Empty state */}
              {filteredStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={COLUMN_COUNT} className="h-48">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Users className="size-12 opacity-30" />
                      <p className="text-sm font-medium">
                        {searchQuery
                          ? 'No students match your search'
                          : isStudied
                            ? 'No suspended / terminated students'
                            : 'No active students in this class'}
                      </p>
                      <p className="text-xs">
                        {searchQuery
                          ? 'Try adjusting your search criteria.'
                          : isStudied
                            ? 'All students are currently active.'
                            : 'Add students to get started.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {/* Data rows */}
              {filteredStudents.map((student, idx) => {
                const status = getStudentStatusLabel(student.studentType)
                const badge = getStatusBadgeConfig(status)
                const hasBirthdayToday =
                  !isStudied && isStudentBirthdayToday(student)

                return (
                  <TableRow
                    key={student.id}
                    className={cn(
                      'group cursor-pointer',
                      status !== 'Active' && 'opacity-70',
                      hasBirthdayToday &&
                      'bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-50/80 dark:hover:bg-amber-950/30',
                    )}
                    onClick={() => handleViewInfo(student)}
                  >
                    {/* # */}
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {hasBirthdayToday ? (
                        <span className="text-amber-500" aria-label="Birthday today">
                          🎂
                        </span>
                      ) : (
                        idx + 1
                      )}
                    </TableCell>

                    {/* Name */}
                    <TableCell>
                      <p className="text-sm font-medium leading-tight truncate max-w-[150px]">
                        {student.studentName ? shortenName(student.studentName) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </p>
                    </TableCell>

                    {/* English Name */}
                    <TableCell className="text-xs text-muted-foreground">
                      {student.englishName || (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>

                    {/* Birthday */}
                    <TableCell className="text-xs tabular-nums">
                      {hasBirthdayToday ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                                <Cake
                                  className="size-3.5 animate-bounce"
                                  style={{ animationDuration: '2s' }}
                                />
                                {student.birthdayFormat ||
                                  formatStudentDate(student.birthday)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="bg-amber-500 text-white border-amber-500"
                            >
                              <p className="text-xs font-medium">
                                🎉 Happy Birthday!
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground">
                          {student.birthdayFormat ||
                            formatStudentDate(student.birthday)}
                        </span>
                      )}
                    </TableCell>

                    {/* Father */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-xs font-medium truncate max-w-[150px]">
                          {student.fatherName || (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </p>
                        {student.fatherPhone && (
                          <p className="text-xs text-muted-foreground font-mono tabular-nums">
                            {student.fatherPhone}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Mother */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-xs font-medium truncate max-w-[150px]">
                          {student.motherName || (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </p>
                        {student.motherPhone && (
                          <p className="text-xs text-muted-foreground font-mono tabular-nums">
                            {student.motherPhone}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Remain Sessions */}
                    <TableCell className="text-center">
                      {(() => {
                        const remain = sessionMap.get(student.studentId)
                        if (remain === undefined) {
                          return (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )
                        }
                        const isLow = remain <= LOW_SESSIONS_THRESHOLD
                        return (
                          <div className="flex items-center justify-center gap-1">
                            <span
                              className={cn(
                                'text-xs font-semibold tabular-nums',
                                isLow
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-foreground',
                              )}
                            >
                              {remain}
                            </span>
                            {isLow && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertTriangle className="size-3.5 text-rose-500" />
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="bg-rose-500 text-white border-rose-500"
                                  >
                                    <p className="text-xs font-medium">
                                      ⚠ Low remaining sessions
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        )
                      })()}
                    </TableCell>

                    {/* Status / Type */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] font-medium', badge.className)}
                      >
                        {isStudied
                          ? badge.label
                          : student.studentTypeText || student.classType || 'Regular'}
                      </Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleViewInfo(student)
                                }}
                                aria-label="View student info"
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Info</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {!isStudied && (
                          <>
                            <Separator
                              orientation="vertical"
                              className="h-4 mx-0.5"
                            />
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 hover:text-amber-600"
                                    onClick={handleChangeStatus}
                                    aria-label="Change status"
                                  >
                                    <UserMinus className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Change Status</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </>
                        )}

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:text-destructive"
                                onClick={handleRemove}
                                aria-label="Remove from class"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remove</TooltipContent>
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
      )}

      {/* Footer — frosted glass (matches students-table.tsx) */}
      <div className="flex items-center justify-between px-4 py-2 border-t shrink-0 bg-card/80 backdrop-blur-sm">
        <div className="text-xs text-muted-foreground">
          <span className="tabular-nums font-medium text-foreground">
            {filteredStudents.length}
          </span>
          {searchQuery && rawList ? (
            <>
              {' '}of{' '}
              <span className="tabular-nums font-medium text-foreground">
                {rawList.length}
              </span>
            </>
          ) : null}{' '}
          {isStudied ? 'record' : 'student'}
          {filteredStudents.length !== 1 ? 's' : ''}
        </div>
        {!isStudied && (
          <span className="text-[10px] text-muted-foreground/60">
            Click row to view details
          </span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TableSkeleton — separate function (design system requirement)
// 8 rows mirroring column layout
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-hidden p-4 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-8 rounded" />
            <Skeleton className="h-4 w-36 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-4 w-12 rounded" />
            <Skeleton className="h-4 w-14 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
          </div>
        ))}
      </div>
      {/* Footer skeleton */}
      <div className="flex items-center justify-between px-4 py-2 border-t shrink-0 bg-card/80">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-36" />
      </div>
    </div>
  )
}
