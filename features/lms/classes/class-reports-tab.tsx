'use client'
// ---------------------------------------------------------------------------
// _components/class-reports-tab.tsx
// Class Reports tab — master-detail: session list (left) + report detail (right)
// Supports read-only view + edit mode for attendance/scores.
// Design: split-pane matching class-lessons-tab.tsx pattern
// ---------------------------------------------------------------------------

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  Clock,
  Edit,
  FileText,
  Loader2,
  MessageSquare,
  Save,
  Search,
  Star,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
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
  useLessonLogs,
  useStudentReport,
  useLessonReport,
  useLessonLogInfo,
  useSaveStudentLessonLog,
  useAssessmentCriteria,
  useStudentAssessments,
  useSaveStudentAssessment,
} from '@/features/lms/hooks/classes/use-classes'
import { useAuthStore } from '@/stores/use-auth-store'
import { getAttendanceBadgeConfig, AttendanceType } from '@/features/lms/types/class-report'
import type { LessonLogEntry, StudentLogEntry } from '@/features/lms/types/class-report'
import { useReportDraftStore } from '@/features/lms/stores/use-report-draft-store'
import type { DraftStudent } from '@/features/lms/stores/use-report-draft-store'
import { cn } from '@/lib/utils'
import { useCan } from '@/lib/use-can'
import { PERMISSIONS } from '@/lib/permissions'
import { TeacherWorklogPane } from './teacher-worklog-pane'

// ---------------------------------------------------------------------------
// Sub-tab types
// ---------------------------------------------------------------------------

type ReportSubTab = 'attendance' | 'stats' | 'worklog'

const SUB_TABS: Array<{ id: ReportSubTab; label: string; icon: typeof UserCheck }> = [
  { id: 'attendance', label: 'Attendance', icon: UserCheck },
  { id: 'stats', label: 'Lesson Stats', icon: BookOpen },
  { id: 'worklog', label: 'Teacher Worklog', icon: ClipboardList },
]

// ---------------------------------------------------------------------------
// Attendance status options for Select dropdown
// ---------------------------------------------------------------------------

const ATTENDANCE_OPTIONS = [
  { value: String(AttendanceType.Present), label: 'Present' },
  { value: String(AttendanceType.Absent), label: 'Absent' },
  { value: String(AttendanceType.Catchup), label: 'Catchup' },
  { value: String(AttendanceType.Demo), label: 'Demo' },
  { value: String(AttendanceType.NoAttendance), label: 'N/A' },
]

// ---------------------------------------------------------------------------
// Star display helpers (read-only + interactive)
// ---------------------------------------------------------------------------

function StarDisplay({ score, max = 5 }: { score: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'size-4',
            i < score
              ? 'fill-amber-400 text-amber-400'
              : 'text-muted-foreground/25',
          )}
        />
      ))}
    </div>
  )
}

/** Interactive star input — click to set score */
function StarInput({
  score,
  max = 5,
  onChange,
}: {
  score: number
  max?: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i + 1 === score ? 0 : i + 1)}
          className="transition-transform hover:scale-110 focus:outline-none"
        >
          <Star
            className={cn(
              'size-4',
              i < score
                ? 'fill-amber-400 text-amber-400'
                : 'text-muted-foreground/25 hover:text-amber-300',
            )}
          />
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Criteria rating display + input (score 1–3 check-circles)
// ---------------------------------------------------------------------------

function CriteriaDisplay({ score, max = 3 }: { score: number; max?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <CheckCircle2
          key={i}
          className={cn(
            'size-4',
            i < score
              ? 'fill-sky-500 text-sky-500'
              : 'text-muted-foreground/25',
          )}
        />
      ))}
    </div>
  )
}

function CriteriaInput({
  score,
  max = 3,
  onChange,
}: {
  score: number
  max?: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i + 1 === score ? 0 : i + 1)}
          className="transition-transform hover:scale-110 focus:outline-none"
        >
          <CheckCircle2
            className={cn(
              'size-4',
              i < score
                ? 'fill-sky-500 text-sky-500'
                : 'text-muted-foreground/25 hover:text-sky-300',
            )}
          />
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ClassReportsTabProps {
  classId: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ClassReportsTab({ classId }: ClassReportsTabProps) {
  const user = useAuthStore((s) => s.user)
  const userId = user?.sub ?? ''

  const [selectedLogId, setSelectedLogId] = useState<string | null>(null)
  const [activeSubTab, setActiveSubTab] = useState<ReportSubTab>('attendance')
  const [searchQuery, setSearchQuery] = useState('')

  // ── Data: session list ────────────────────────────────────────────────
  const {
    data: lessonLogs,
    isLoading: loadingLogs,
  } = useLessonLogs(userId, classId)

  // Auto-select first session when data arrives
  const effectiveLogId = selectedLogId ?? lessonLogs?.[0]?.id ?? null

  // ── Data: detail panes (fire only when a session is selected) ──────
  const { data: studentReport, isLoading: loadingStudents } =
    useStudentReport(classId, effectiveLogId)
  const { data: lessonReport, isLoading: loadingStats } =
    useLessonReport(effectiveLogId)
  const { data: logInfo } =
    useLessonLogInfo(effectiveLogId)

  // ── Filtered session list ─────────────────────────────────────────────
  const filteredLogs = useMemo(() => {
    if (!lessonLogs) return []
    if (!searchQuery.trim()) return lessonLogs
    const q = searchQuery.toLowerCase()
    return lessonLogs.filter(
      (log) =>
        (log.lesson ?? '').toLowerCase().includes(q) ||
        (log.subject ?? '').toLowerCase().includes(q) ||
        (log.reportBy ?? '').toLowerCase().includes(q) ||
        (log.lessonDate ?? '').includes(q),
    )
  }, [lessonLogs, searchQuery])

  // ── Selected session data ──────────────────────────────────────────────
  const selectedSession =
    lessonLogs?.find((l) => l.id === effectiveLogId) ?? null

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden">
      {/* ════════════════ LEFT PANE: Session List ════════════════ */}
      <div className="w-64 border-r shrink-0 flex flex-col overflow-hidden">
        {/* Search */}
        <div className="p-2 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search sessions..."
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

        {/* Session list */}
        <ScrollArea className="flex-1 min-h-0">
          {loadingLogs ? (
            <div className="p-3 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3.5 w-full rounded" />
                  <Skeleton className="h-3 w-3/4 rounded" />
                </div>
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="size-8 opacity-20 mb-2" />
              <p className="text-xs">
                {searchQuery ? 'No matching sessions' : 'No reports yet'}
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <SessionRow
                key={log.id}
                log={log}
                isSelected={log.id === effectiveLogId}
                onClick={() => {
                  setSelectedLogId(log.id)
                  setActiveSubTab('attendance')
                }}
              />
            ))
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="px-3 py-1.5 border-t shrink-0 bg-card/80 backdrop-blur-sm">
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {filteredLogs.length} session{filteredLogs.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ════════════════ RIGHT PANE: Report Detail ════════════════ */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {!effectiveLogId || !selectedSession ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <FileText className="size-12 opacity-15 mb-3" />
            <p className="text-sm font-medium">Select a session to view</p>
            <p className="text-xs mt-1 text-muted-foreground/60">
              Click a session from the left panel
            </p>
          </div>
        ) : (
          <>
            {/* Header bar */}
            <div className="px-4 py-2.5 border-b shrink-0 flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-foreground truncate min-w-0">
                #{selectedSession.lesson} • {selectedSession.content}
              </h2>
              <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3" />
                  {selectedSession.lessonDate}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  {selectedSession.startTimeLocal}–{selectedSession.endTimeLocal}
                </span>
                {logInfo?.teachers && (
                  <span className="inline-flex items-center gap-1">
                    <UserCheck className="size-3" />
                    {logInfo.teachers}
                  </span>
                )}
              </div>
            </div>

            {/* Sub-tab navigation */}
            <div className="flex items-center border-b px-4 shrink-0">
              {SUB_TABS.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSubTab(tab.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors',
                      activeSubTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="size-3.5" />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Sub-tab content */}
            <ScrollArea className="flex-1 min-h-0">
              {activeSubTab === 'attendance' && (
                <AttendancePane
                  classId={classId}
                  data={studentReport ?? []}
                  isLoading={loadingStudents}
                  logId={effectiveLogId}
                  classLessonId={selectedSession?.classLessonId ?? null}
                />
              )}
              {activeSubTab === 'stats' && (
                <LessonStatsPane
                  data={lessonReport ?? []}
                  isLoading={loadingStats}
                />
              )}
              {activeSubTab === 'worklog' && (
                <TeacherWorklogPane logId={effectiveLogId} classId={classId} />
              )}
            </ScrollArea>
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SessionRow — left-pane list item
// ---------------------------------------------------------------------------

function SessionRow({
  log,
  isSelected,
  onClick,
}: {
  log: LessonLogEntry
  isSelected: boolean
  onClick: () => void
}) {
  const hasReport = !!log.reportBy

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex flex-col gap-0.5 p-3 border-b border-border text-left transition-colors hover:bg-muted/40',
        isSelected
          ? 'bg-muted/60 border-l-2 border-l-primary'
          : 'border-l-2 border-l-transparent',
      )}
    >
      <div className="flex justify-between items-start gap-1">
        <span className="font-bold text-xs text-foreground leading-tight pr-1">
          Lesson {log.lesson} • {log.lessonDate}{' '}
          <span className="text-[10px] font-semibold text-muted-foreground ml-0.5">
            {log.startTimeLocal}
          </span>
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {hasReport ? (
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
              )}
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {hasReport ? 'Submitted' : 'Pending'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <span className="text-xs text-muted-foreground truncate leading-tight" title={log.subject ?? ''}>
        {log.subject || '—'}
      </span>
      {log.reportBy && (
        <span className="text-[10px] text-muted-foreground/70 truncate">
          by {log.reportBy}
        </span>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// AttendancePane — card-based student attendance + star scores
// Supports read-only and edit mode with Save mutation.
// ---------------------------------------------------------------------------

/**
 * Card left-border + subtle background tint based on attendance status.
 */
function getStatusCardStyle(present: number): string {
  switch (present) {
    case AttendanceType.Present:
      return 'border-l-4 border-l-emerald-500 border-emerald-100/50 bg-emerald-50/10 dark:bg-emerald-950/5'
    case AttendanceType.Absent:
      return 'border-l-4 border-l-rose-500 border-rose-100/50 bg-rose-50/10 dark:bg-rose-950/5'
    case AttendanceType.Catchup:
      return 'border-l-4 border-l-blue-500 border-blue-100/50 bg-blue-50/10 dark:bg-blue-950/5'
    case AttendanceType.Demo:
      return 'border-l-4 border-l-violet-500 border-violet-100/50 bg-violet-50/10 dark:bg-violet-950/5'
    case AttendanceType.NoAttendance:
    default:
      return 'border-l-4 border-l-muted-foreground/30 border-border'
  }
}

/**
 * Status badge icon component.
 */
function StatusIcon({ present }: { present: number }) {
  switch (present) {
    case AttendanceType.Present:
      return <CheckCircle2 className="size-3 mr-1" />
    case AttendanceType.Absent:
      return <XCircle className="size-3 mr-1" />
    case AttendanceType.Catchup:
      return <CheckCircle2 className="size-3 mr-1" />
    case AttendanceType.Demo:
      return <CheckCircle2 className="size-3 mr-1" />
    default:
      return <AlertCircle className="size-3 mr-1" />
  }
}

/** Editable local state per student (same shape as DraftStudent) */
type EditableStudent = DraftStudent

function AttendancePane({
  classId,
  data,
  isLoading,
  logId,
  classLessonId,
}: {
  classId: string
  data: StudentLogEntry[]
  isLoading: boolean
  logId: string | null
  classLessonId: string | null
}) {
  const canLessonLogWrite = useCan(PERMISSIONS.TEACHER_LESSONLOG_WRITE)
  const canAssessmentWrite = useCan(PERMISSIONS.TEACHER_ASSESSMENT_WRITE)

  const [isEditing, setIsEditing] = useState(false)
  const [editState, setEditState] = useState<EditableStudent[]>([])
  const [draftRestored, setDraftRestored] = useState(false)
  const saveMutation = useSaveStudentLessonLog()
  const saveAssessmentMutation = useSaveStudentAssessment(classLessonId)

  // Draft store
  const { saveDraft, getDraft, clearDraft, hasDraft } = useReportDraftStore()
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch assessment criteria (master data) and current student assessments
  const { data: criteriaList } = useAssessmentCriteria()
  const { data: assessments } = useStudentAssessments(classLessonId)

  // Build a lookup: studentId → { criteriaNumber → score }
  const assessmentMap = useMemo(() => {
    const map: Record<string, Record<number, number>> = {}
    if (assessments) {
      for (const a of assessments) {
        if (!map[a.studentId]) map[a.studentId] = {}
        map[a.studentId][a.criteriaNumber] = a.score
      }
    }
    return map
  }, [assessments])

  // Build fresh edit state from API data
  const freshEditState = useMemo(() => {
    if (data.length === 0) return []
    return data.map((s) => ({
      id: s.id,
      present: s.present,
      starScore: s.starScore,
      note: s.note ?? '',
      criteria: assessmentMap[s.studentInfoId] ?? {},
    }))
  }, [data, assessmentMap])

  // Sync edit state: restore draft if exists, otherwise use fresh API data
  useEffect(() => {
    if (freshEditState.length === 0) return

    if (logId && hasDraft(logId)) {
      const draft = getDraft(logId)
      if (draft) {
        // Restore draft — merge with fresh IDs in case roster changed
        const draftMap = new Map(draft.students.map((s) => [s.id, s]))
        const merged = freshEditState.map((fresh) => draftMap.get(fresh.id) ?? fresh)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEditState(merged)

        setIsEditing(true)

        setDraftRestored(true)
        return
      }
    }


    setEditState(freshEditState)

    setDraftRestored(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshEditState, logId])

  // Auto-save draft to localStorage (debounced 500ms) when editing
  useEffect(() => {
    if (!isEditing || !logId || editState.length === 0) return

    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current)
    draftSaveTimerRef.current = setTimeout(() => {
      saveDraft(logId, editState)
    }, 500)

    return () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current)
    }
  }, [editState, isEditing, logId, saveDraft])

  // beforeunload warning when editing
  useEffect(() => {
    if (!isEditing) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isEditing])

  // Reset editing state when logId changes (but don't clear draft — user may come back)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsEditing(false)

    setDraftRestored(false)
  }, [logId])

  const updateField = useCallback(
    (id: string, field: keyof Omit<EditableStudent, 'criteria'>, value: number | string) => {
      setEditState((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
      )
    },
    [],
  )

  const updateCriteria = useCallback(
    (id: string, criteriaNumber: number, value: number) => {
      setEditState((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, criteria: { ...s.criteria, [criteriaNumber]: value } }
            : s,
        ),
      )
    },
    [],
  )

  const handleSave = useCallback(async () => {
    if (!logId) return
    // Save each changed student record sequentially
    for (const student of editState) {
      const original = data.find((s) => s.id === student.id)
      if (
        !original ||
        (original.present === student.present &&
          original.starScore === student.starScore &&
          (original.note ?? '') === student.note)
      ) {
        // Even if attendance is unchanged, check criteria changes below
      } else {
        await saveMutation.mutateAsync({
          classId,
          logId,
          id: student.id,
          data: {
            present: student.present,
            starScore: student.starScore,
            note: student.note,
          },
        })
      }

      // Save assessment criteria scores
      if (criteriaList && original) {
        const origCriteria = assessmentMap[original.studentInfoId] ?? {}
        for (const criteria of criteriaList) {
          const newScore = student.criteria[criteria.criteriaNumber] ?? 0
          const oldScore = origCriteria[criteria.criteriaNumber] ?? 0
          if (newScore !== oldScore) {
            await saveAssessmentMutation.mutateAsync({
              studentLessonLogId: student.id,
              assessmentCriteriaId: criteria.id,
              score: newScore,
            })
          }
        }
      }
    }
    setIsEditing(false)
    setDraftRestored(false)
    // Clean up draft from localStorage after successful save
    if (logId) clearDraft(logId)
  }, [classId, editState, data, saveMutation, criteriaList, assessmentMap, saveAssessmentMutation, logId, clearDraft])

  if (isLoading) return <AttendanceSkeleton />

  if (data.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No attendance data"
        subtitle="No students recorded for this session"
      />
    )
  }

  return (
    <div className="p-4 space-y-3">
      {/* Section header with edit/save toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <UserCheck className="size-3.5" />
          Student List ({data.length})
        </h3>
        {(canLessonLogWrite || canAssessmentWrite) && (
          <Button
            variant={isEditing ? 'default' : 'outline'}
            size="sm"
            onClick={isEditing ? handleSave : () => setIsEditing(true)}
            disabled={saveMutation.isPending || saveAssessmentMutation.isPending}
            className="h-7 text-xs gap-1.5"
          >
            {saveMutation.isPending || saveAssessmentMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : isEditing ? (
              <Save className="size-3.5" />
            ) : (
              <Edit className="size-3.5" />
            )}
            {saveMutation.isPending || saveAssessmentMutation.isPending
              ? 'Saving...'
              : isEditing
                ? 'Save All'
                : 'Edit'}
          </Button>
        )}
        {isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsEditing(false)
              setDraftRestored(false)
              setEditState(freshEditState)
              if (logId) clearDraft(logId)
            }}
            className="h-7 text-xs gap-1.5 text-muted-foreground"
          >
            <X className="size-3.5" />
            Discard
          </Button>
        )}
      </div>

      {/* Draft restored banner */}
      {draftRestored && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertCircle className="size-3.5 shrink-0" />
          <span className="font-medium">Unsaved draft restored.</span>
          <span className="text-amber-600 dark:text-amber-400">Review and save or discard your changes.</span>
        </div>
      )}

      {/* Student cards */}
      <div className="grid grid-cols-1 gap-3">
        {data.map((student) => {
          const edit = editState.find((e) => e.id === student.id)
          const present = isEditing ? (edit?.present ?? student.present) : student.present
          const starScore = isEditing ? (edit?.starScore ?? student.starScore) : student.starScore
          const note = isEditing ? (edit?.note ?? student.note ?? '') : (student.note ?? '')
          const badge = getAttendanceBadgeConfig(present)
          const hasNote = !!note.trim()
          const showStars =
            present === AttendanceType.Present ||
            present === AttendanceType.Catchup ||
            present === AttendanceType.Demo

          return (
            <div
              key={student.id}
              className={cn(
                'relative rounded-lg border p-3 transition-all flex flex-col gap-3 shadow-sm',
                getStatusCardStyle(present),
                isEditing && 'ring-1 ring-ring/20',
              )}
            >
              {/* ── TOP ROW: Identity + Status + Star Score ── */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                {/* Left: Student Identity */}
                <div className="flex items-center gap-3 shrink-0 min-w-0">
                  {/* Avatar — initials circle */}
                  <div className="size-9 rounded-full border border-border bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                    {(student.englishName || student.studentName || '?')
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {student.englishName || '—'}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        – {student.studentName || '—'}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5 ps-2">
                        {isEditing && canLessonLogWrite ? (
                          <Select
                            value={String(present)}
                            onValueChange={(v) =>
                              updateField(student.id, 'present', Number(v))
                            }
                          >
                            <SelectTrigger size="sm" className="h-6 text-[10px] w-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ATTENDANCE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-bold uppercase tracking-wide px-2 py-0 h-5 inline-flex items-center',
                              badge.className,
                            )}
                          >
                            <StatusIcon present={present} />
                            {badge.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Star Score + Criteria Ratings */}
                <div className="flex items-center gap-4 w-full sm:w-auto sm:justify-end shrink-0 flex-wrap">
                  {showStars && (
                    <>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[9px] font-bold uppercase text-muted-foreground/60 tracking-wider">
                          Star Score
                        </span>
                        {isEditing && canLessonLogWrite ? (
                          <StarInput
                            score={starScore}
                            onChange={(v) =>
                              updateField(student.id, 'starScore', v)
                            }
                          />
                        ) : (
                          <StarDisplay score={starScore} />
                        )}
                      </div>

                      {/* Assessment criteria: Interact / Attitude / Focus */}
                      {criteriaList && criteriaList.length > 0 && (
                        <>
                          <Separator orientation="vertical" className="h-8 hidden sm:block" />
                          {criteriaList
                            .sort((a, b) => a.criteriaNumber - b.criteriaNumber)
                            .map((criteria) => {
                              const criteriaScore = isEditing
                                ? (edit?.criteria[criteria.criteriaNumber] ?? 0)
                                : (assessmentMap[student.studentInfoId]?.[criteria.criteriaNumber] ?? 0)
                              return (
                                <div
                                  key={criteria.id}
                                  className="flex flex-col items-center gap-0.5"
                                >
                                  <span className="text-[9px] font-bold uppercase text-muted-foreground/60 tracking-wider">
                                    {criteria.name}
                                  </span>
                                  {isEditing && canAssessmentWrite ? (
                                    <CriteriaInput
                                      score={criteriaScore}
                                      onChange={(v) =>
                                        updateCriteria(
                                          student.id,
                                          criteria.criteriaNumber,
                                          v,
                                        )
                                      }
                                    />
                                  ) : (
                                    <CriteriaDisplay score={criteriaScore} />
                                  )}
                                </div>
                              )
                            })}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              <Separator className="bg-border/50" />

              {/* ── BOTTOM ROW: Teacher Comment ── */}
              <div className="w-full">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <MessageSquare className="size-3 text-muted-foreground/60" />
                  <span
                    className={cn(
                      'text-[10px] font-bold uppercase tracking-wider',
                      !hasNote && !isEditing
                        ? 'text-muted-foreground/40'
                        : 'text-muted-foreground/60',
                    )}
                  >
                    Teacher&apos;s Comment
                  </span>
                </div>
                {isEditing && canLessonLogWrite ? (
                  <Textarea
                    value={note}
                    onChange={(e) =>
                      updateField(student.id, 'note', e.target.value)
                    }
                    rows={2}
                    placeholder="Write a comment about the student's performance..."
                    className="text-sm resize-none"
                  />
                ) : (
                  <div
                    className={cn(
                      'text-sm leading-relaxed px-3 py-2 rounded-md border',
                      hasNote
                        ? 'bg-muted/30 border-border text-foreground/85'
                        : 'bg-muted/10 border-border/40 text-muted-foreground/50 italic',
                    )}
                  >
                    {note || 'No comment provided.'}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Loading skeleton for attendance cards */
function AttendanceSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border p-3 space-y-2.5">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-28 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          </div>
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// LessonStatsPane — lesson unit execution stats
// ---------------------------------------------------------------------------

function LessonStatsPane({
  data,
  isLoading,
}: {
  data: import('@/features/lms/types/class-report').LessonStatEntry[]
  isLoading: boolean
}) {
  if (isLoading) return <PaneSkeleton rows={5} cols={6} />

  if (data.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No lesson statistics"
        subtitle="No unit execution data recorded"
      />
    )
  }

  return (
    <Table>
      <TableHeader className="sticky top-0 bg-card z-10">
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[40px] text-xs">#</TableHead>
          <TableHead className="text-xs min-w-[60px]">Plan</TableHead>
          <TableHead className="text-xs min-w-[180px]">Procedure</TableHead>
          <TableHead className="text-xs min-w-[140px]">Material</TableHead>
          <TableHead className="text-xs min-w-[80px] text-center">
            Actual
          </TableHead>
          <TableHead className="text-xs min-w-[140px]">Note</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((stat) => {
            // Compare plan vs actual (plan is string "10", actual is "mm:ss" or minutes)
            const planMins = parseInt(stat.time, 10) || 0
            const actualMins = parseActualTime(stat.actualTime)
            const isOvertime = actualMins > planMins && planMins > 0

            return (
              <TableRow key={stat.id}>
                <TableCell className="text-xs text-muted-foreground tabular-nums">
                  {stat.sortOrder}
                </TableCell>
                <TableCell className="text-xs font-mono tabular-nums">
                  {stat.time}m
                </TableCell>
                <TableCell className="text-sm font-medium">
                  {stat.procedures}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {stat.materials || (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <span
                    className={cn(
                      'text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded',
                      isOvertime
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                        : 'bg-muted text-foreground',
                    )}
                  >
                    {stat.actualTime}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground italic">
                  {stat.note || ''}
                </TableCell>
              </TableRow>
            )
          })}
      </TableBody>
    </Table>
  )
}

/** Parse "mm:ss" or plain minutes string to a number of minutes. */
function parseActualTime(raw: string): number {
  if (!raw) return 0
  // "mm:ss" format
  const parts = raw.split(':')
  if (parts.length === 2) {
    return parseInt(parts[0], 10) + (parseInt(parts[1], 10) > 0 ? 1 : 0)
  }
  return parseInt(raw, 10) || 0
}


// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Shared: EmptyState
// ---------------------------------------------------------------------------

function EmptyState({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Users
  title: string
  subtitle: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Icon className="size-10 opacity-15 mb-3" />
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs mt-1 text-muted-foreground/60">{subtitle}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared: PaneSkeleton
// ---------------------------------------------------------------------------

function PaneSkeleton({ rows, cols }: { rows: number; cols: number }) {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton
              key={j}
              className="h-4 rounded"
              style={{ width: `${60 + Math.random() * 80}px` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
