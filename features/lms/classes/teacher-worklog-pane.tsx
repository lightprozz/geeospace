'use client'
// ---------------------------------------------------------------------------
// teacher-worklog-pane.tsx
// Teacher Worklog sub-tab for Class Reports
// Manages per-session teacher effort tracking (shift types, substitutes, expat)
//
// v2 CUTOVER (WRK v2): migrated off v1 `/api/WorkLog/*` onto lib/worklog +
// hooks/worklog. Key differences from the v1 pane, see the phase report for
// full rationale:
//
//  - LIST: Amendment 2 added a `teacherLessonLogId` lesson-scoped mode to
//    `/worklog/query` — one call, keyed by this lesson's anchor id, returns
//    ALL owners' rows for that lesson (visibility: caller holds
//    worklog.approve OR passes the class-membership check for the anchor's
//    class). This replaced the earlier per-owner `useQueries` fan-out
//    (one `/worklog/query` call per class teacher + caller, filtered
//    client-side) — that approach both required a client-derived date
//    window (fragile against unparseable legacy lesson dates) and could
//    403 a plain Teacher querying a co-teacher's concrete `ownerId`.
//  - CREATE: Amendment 2 added `targetTeacherId` to `CreateWorkLogRequest` —
//    the server now authoritatively attributes (or 403s) a create for a
//    specific co-teacher/substitute/expat, gated by caller==target-or-approve
//    AND class-membership. This replaced the earlier create-then-verify-then-
//    rollback dance (create for the anchor's implicit teacher, check the
//    response, delete-and-throw on mismatch) — there is nothing left for the
//    FE to verify since the server rejects a disallowed target outright.
//  - UPDATE: v2's UpdateWorkLogRequest only accepts score/comment/evaluate/
//    order — effortType/isExpat/teacherId/subsForTeacherId are immutable.
//    Changing any of those on an existing row is done as create-then-delete
//    (in that order, so a rejected create never destroys the original row).
//    An Accepted (payroll-final) original blocks this replace up front
//    unless the caller can approve.
//  - EVENT: v1 exposed `check-exist-event` so the FE could show an
//    interactive "Event" checkbox before saving. v2 has no such endpoint
//    because `isEvent`/`eventTime` are no longer client-settable at all —
//    the BE auto-computes them from overlapping ClassEvents at CREATE time
//    (see WorkLogServiceV2.CreateAsync). The checkbox is replaced with a
//    read-only "Event" badge sourced from the loaded row's own isEvent/
//    eventTime (unknown for unsaved drafts, so it only shows once saved).
//  - `evaluate` (Amendment 2): now readable on `WorkLogItemV2` — `toDraft`
//    preserves it from the loaded row instead of always resetting to false.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CalendarClock,
  Check,
  ChevronsUpDown,
  ClipboardList,
  Edit,
  Loader2,
  Save,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useAllTeachers, useClassTeachers } from '@/features/lms/hooks/classes/use-classes'
import { useShiftOptions } from '@/features/lms/hooks/worklog/use-shift-options'
import {
  useCreateWorkLog,
  useDeleteWorkLog,
  useUpdateWorkLog,
} from '@/features/lms/hooks/worklog/use-worklog-mutations'
import { useWorkLogsByLessonLog } from '@/features/lms/hooks/worklog/use-worklogs'
import { isApprovedLockedError, isConcurrencyError } from '@/features/lms/lib/worklog/api'
import { worklogKeys } from '@/features/lms/lib/worklog/query-keys'
import { hasWorklogEditableChanges } from './worklog-edits'
import { useCan } from '@/lib/use-can'
import { PERMISSIONS } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import type { AllTeacher, ShiftOption, WorkLogItemV2 } from '@/features/lms/types/worklog'
import {
  CT_HALF_OPTIONS,
  EXPAT_OPTIONS,
  MT_HALF_OPTIONS,
  ShiftTypeConstant,
  WorkLogStatusV2,
} from '@/features/lms/types/worklog'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TeacherWorklogPaneProps {
  logId: string | null
  classId: string
}

// ---------------------------------------------------------------------------
// Local editable-draft shape
// The v2 API has no "draft" concept — this is a pure FE representation of a
// worklog row while the pane is in edit mode, mapped to/from WorkLogItemV2.
// ---------------------------------------------------------------------------

interface WorkLogDraft {
  /** null = not yet created (unsaved draft row) */
  id: string | null
  teacherId: string
  subsForTeacherId: string
  isExpat: boolean
  effortType: string
  score: number
  comment: string
  evaluate: boolean
  order: number
  /** Server-computed; read-only. Always false/0 for unsaved drafts. */
  isEvent: boolean
  eventTime: number
  /** Concurrency token — null for unsaved drafts (not needed until update/delete). */
  updatedAt: string | null
}

function emptyDraft(overrides: Partial<WorkLogDraft> = {}): WorkLogDraft {
  return {
    id: null,
    teacherId: '',
    subsForTeacherId: '',
    isExpat: false,
    effortType: '',
    score: 0,
    comment: '',
    evaluate: false,
    order: 0,
    isEvent: false,
    eventTime: 0,
    updatedAt: null,
    ...overrides,
  }
}

function toDraft(item: WorkLogItemV2): WorkLogDraft {
  return {
    id: item.id,
    teacherId: item.teacherId,
    subsForTeacherId: item.subsForTeacherId ?? '',
    isExpat: item.isExpat,
    effortType: item.effortType,
    score: item.score,
    comment: item.comment ?? '',
    // Amendment 2: WorkLogItemV2.evaluate is now readable — preserve it
    // rather than clobbering to false (M2: a save that didn't touch the
    // checkbox must not silently reset a previously-set evaluate=true).
    evaluate: item.evaluate,
    order: item.order,
    isEvent: item.isEvent,
    eventTime: item.eventTime,
    updatedAt: item.updatedAt,
  }
}

/**
 * True when saving `draft` over `original` would require an immutable-field
 * replace (create-then-delete) instead of a plain PUT — v2's
 * UpdateWorkLogRequest only accepts score/comment/evaluate/order.
 */
function isImmutableFieldChanged(
  original: WorkLogItemV2 | undefined,
  draft: WorkLogDraft,
): boolean {
  return (
    !original ||
    original.effortType !== draft.effortType ||
    original.isExpat !== draft.isExpat ||
    original.teacherId !== draft.teacherId ||
    (original.subsForTeacherId ?? '') !== draft.subsForTeacherId
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTeacherName(t: { englishName?: string | null; fullName: string }) {
  return t.englishName ? `${t.englishName} - ${t.fullName}` : t.fullName
}

/**
 * Consolidated shift-type option filter.
 *
 * Rules:
 * 1. If another teacher has 'alone'/'alone_expat' → only 'off' is available
 * 2. If any teacher already chose main_teacher/main_full/co_teacher → hide alone/alone_expat
 * 3. If expat is active:
 *     Main Teacher → mt_half, mf_half, alone*, off
 *     Co-Teacher   → ct_half, alone*, off
 * 4. If no expat:
 *     Main Teacher → main_teacher, main_full, alone*, half variants, off
 *     Co-Teacher   → co_teacher, alone*, half variants, off
 *
 * (* alone/alone_expat hidden when hasRoleShift is true — rule 2)
 */
function getFilteredOptions(
  allOptions: ShiftOption[],
  isPrimary: boolean,
  hasAlone: boolean,
  hasExpat: boolean,
  hasRoleShift: boolean,
): ShiftOption[] {
  // Another teacher already chose alone → only off
  if (hasAlone) {
    return allOptions.filter((x) => x.value === ShiftTypeConstant.Off)
  }

  // Helper: should alone variants be excluded?
  const excludeAlone = (value: string) =>
    hasRoleShift &&
    (value === ShiftTypeConstant.Alone || value === ShiftTypeConstant.AloneExpat)

  // Expat is active → restrict to half-shift variants + alone/alone_expat + off
  if (hasExpat) {
    const allowedValues: string[] = isPrimary
      ? [...MT_HALF_OPTIONS, ShiftTypeConstant.Alone, ShiftTypeConstant.AloneExpat, ShiftTypeConstant.Off]
      : [...CT_HALF_OPTIONS, ShiftTypeConstant.Alone, ShiftTypeConstant.AloneExpat, ShiftTypeConstant.Off]
    return allOptions.filter(
      (x) => allowedValues.includes(x.value) && !excludeAlone(x.value),
    )
  }

  // No expat → normal role-based filtering
  return allOptions.filter((x) => {
    // Always exclude expat-only options from class teacher dropdown
    if (EXPAT_OPTIONS.includes(x.value as typeof EXPAT_OPTIONS[number])) return false
    // alone_expat is only available when expat is active
    if (x.value === ShiftTypeConstant.AloneExpat) return false
    // If a role shift is already selected, hide alone
    if (excludeAlone(x.value)) return false
    // Role-based exclusion
    if (isPrimary) {
      return x.value !== ShiftTypeConstant.CoTeacher &&
             x.value !== ShiftTypeConstant.CtHalf
    }
    return x.value !== ShiftTypeConstant.MainTeacher &&
           x.value !== ShiftTypeConstant.MainFull &&
           x.value !== ShiftTypeConstant.MtHalf &&
           x.value !== ShiftTypeConstant.MfHalf
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TeacherWorklogPane({ logId, classId }: TeacherWorklogPaneProps) {
  const hasApprove = useCan(PERMISSIONS.WORKLOG_APPROVE)
  const qc = useQueryClient()

  const { data: classTeachers = [] } = useClassTeachers(classId)
  const { data: allTeachersRaw = [] } = useAllTeachers()
  const { data: shiftOptions = [], isLoading: loadingSO } = useShiftOptions(classId)

  // invalidateOnSuccess: false — the pane batches invalidation once after the
  // whole save loop (M4) instead of once per mutation; see handleSave's
  // `finally` block.
  const createWorkLogMutation = useCreateWorkLog({ invalidateOnSuccess: false })
  const updateWorkLogMutation = useUpdateWorkLog({ invalidateOnSuccess: false })
  const deleteWorkLogMutation = useDeleteWorkLog({ invalidateOnSuccess: false })

  // ── Lesson-scoped worklog query (Amendment 2) — ONE call keyed by this
  //    lesson's anchor id, returns ALL owners' rows for the lesson. Replaces
  //    the earlier per-owner useQueries fan-out + client-derived date window
  //    (see file header). No concrete `ownerId` is ever passed here, so this
  //    query cannot 403 a plain assigned Teacher (C1 defense-in-depth: there
  //    is no remaining concrete-ownerId query path in this pane to guard).
  const {
    data: lessonWorkLogsResult,
    isLoading: loadingWLQuery,
    isError: wlError,
    refetch: refetchWorkLogs,
  } = useWorkLogsByLessonLog(logId, { enabled: !!logId })

  // `lessonWorkLogsResult` (TanStack Query's `data`) is referentially stable
  // across re-renders unless a fetch actually resolves with new content, so
  // this useMemo needs no extra fingerprinting trick.
  const mergedItems = useMemo(() => lessonWorkLogsResult?.items ?? [], [lessonWorkLogsResult])

  const loadingWL = !!logId && loadingWLQuery

  // ── Local state ───────────────────────────────────────────────────────
  const [workLogs, setWorkLogs] = useState<WorkLogDraft[]>([])
  const [workLogsAudit, setWorkLogsAudit] = useState<WorkLogItemV2[]>([])
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Sync from API data once loading has settled. Guarded on `saving` (M4) so
  // an in-flight save's invalidation-triggered refetch can't clobber the
  // in-progress drafts or flip `editing` back off mid-save.
  useEffect(() => {
    if (saving || loadingWL || loadingSO || !logId) return
    if (wlError) {
      // Explicit error state (M3) — never synthesize empty drafts or
      // auto-enter edit mode on a failed fetch; that would mask a real
      // authz/network failure as "no worklogs yet, please create some".
      // Syncing fetched (error) state into local draft state is the intended
      // use of this effect (react-hooks/set-state-in-effect only needs
      // suppressing on the first setState per effect).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWorkLogs([])
      setWorkLogsAudit([])
      setEditing(false)
      return
    }
    if (mergedItems.length === 0) {
      // No worklogs → create defaults from class teachers.
      const defaults = classTeachers.map((ct) => emptyDraft({ teacherId: ct.teacherId }))
      setWorkLogs(defaults)
      setWorkLogsAudit([])
      setEditing(true)
    } else {
      setWorkLogs(mergedItems.map(toDraft))
      setWorkLogsAudit(mergedItems)
      setEditing(false)
    }
  }, [mergedItems, classTeachers, logId, loadingWL, loadingSO, wlError, saving])

  // ── Derived data ──────────────────────────────────────────────────────
  const mainTeacherLogs = useMemo(
    () => workLogs.filter((w) => w.subsForTeacherId === '' && !w.isExpat),
    [workLogs],
  )

  const expatLog = useMemo(
    () => workLogs.find((w) => w.isExpat) ?? null,
    [workLogs],
  )

  // All center teachers excluding class teachers (matches legacy WorkLog.js line 84-86)
  const allTeachersForSubs = useMemo(() => {
    const classTeacherIds = new Set(classTeachers.map((ct) => ct.teacherId))
    return allTeachersRaw.filter((t) => !classTeacherIds.has(t.id))
  }, [allTeachersRaw, classTeachers])

  // Expat teachers — only those flagged isExpat (matches legacy WorkLog.js line 448)
  const expatTeachers = useMemo(
    () => allTeachersForSubs.filter((t) => t.isExpat),
    [allTeachersForSubs],
  )

  // Whether expat section is active — drives shift-type constraint on class teachers
  const hasExpat = !!expatLog

  // ── Handlers ──────────────────────────────────────────────────────────

  const onEffortTypeChange = useCallback(
    (teacherId: string, effortType: string) => {
      const score = shiftOptions.find((x) => x.value === effortType)?.score ?? 0

      setWorkLogs((prev) => {
        // If switching away from 'off', remove any substitute for this teacher
        let updated =
          effortType !== ShiftTypeConstant.Off
            ? prev.filter((w) => w.subsForTeacherId !== teacherId)
            : prev

        const isAloneVariant =
          effortType === ShiftTypeConstant.Alone ||
          effortType === ShiftTypeConstant.AloneExpat

        // If setting 'alone' or 'alone_expat', set all others to 'off'
        if (isAloneVariant) {
          updated = updated.map((w) => {
            if (w.teacherId === teacherId && !w.subsForTeacherId && !w.isExpat) {
              return { ...w, effortType, score }
            }
            if (!w.subsForTeacherId && !w.isExpat) {
              return { ...w, effortType: ShiftTypeConstant.Off }
            }
            return w
          })
        } else {
          updated = updated.map((w) =>
            w.teacherId === teacherId && !w.subsForTeacherId && !w.isExpat
              ? { ...w, effortType, score }
              : w,
          )
        }

        return updated
      })
    },
    [shiftOptions],
  )

  const onSubstituteChange = useCallback(
    (subsForTeacherId: string, field: 'teacherId' | 'effortType', value: string) => {
      setWorkLogs((prev) => {
        const existing = prev.find((w) => w.subsForTeacherId === subsForTeacherId)
        const scorePatch =
          field === 'effortType'
            ? { score: shiftOptions.find((x) => x.value === value)?.score ?? 0 }
            : {}

        if (!existing) {
          return [...prev, emptyDraft({ subsForTeacherId, [field]: value, ...scorePatch })]
        }
        return prev.map((w) =>
          w.subsForTeacherId === subsForTeacherId
            ? { ...w, [field]: value, ...scorePatch }
            : w,
        )
      })
    },
    [shiftOptions],
  )

  const onExpatToggle = useCallback((checked: boolean) => {
    if (checked) {
      setWorkLogs((prev) => [...prev.filter((w) => !w.isExpat), emptyDraft({ isExpat: true })])
    } else {
      setWorkLogs((prev) => prev.filter((w) => !w.isExpat))
    }
  }, [])

  const onExpatFieldChange = useCallback(
    (field: 'teacherId' | 'effortType' | 'evaluate' | 'comment', value: string | boolean) => {
      setWorkLogs((prev) =>
        prev.map((w) =>
          w.isExpat
            ? {
                ...w,
                [field]: value,
                ...(field === 'effortType'
                  ? { score: shiftOptions.find((x) => x.value === value)?.score ?? 0 }
                  : {}),
              }
            : w,
        ),
      )
    },
    [shiftOptions],
  )

  const handleCancel = useCallback(() => {
    if (workLogsAudit.length > 0) {
      setWorkLogs(workLogsAudit.map(toDraft))
      setEditing(false)
    } else {
      refetchWorkLogs()
    }
  }, [workLogsAudit, refetchWorkLogs])

  /**
   * Creates a worklog for `w`, attributed via `targetTeacherId` (Amendment
   * 2). The server authoritatively checks caller==target-or-approve AND
   * class-membership and 403s a disallowed target outright, so — unlike the
   * old anchor-only create — there is nothing left for the FE to verify or
   * roll back after a successful response.
   */
  const createEntry = useCallback(
    (w: WorkLogDraft) =>
      createWorkLogMutation.mutateAsync({
        teacherLessonLogId: logId ?? undefined,
        targetTeacherId: w.teacherId,
        effortType: w.effortType,
        score: w.score,
        comment: w.comment,
        evaluate: w.evaluate,
        order: w.order,
        isExpat: w.isExpat,
      }),
    [logId, createWorkLogMutation],
  )

  const handleSave = useCallback(async () => {
    if (!logId) return

    const auditById = new Map(workLogsAudit.map((w) => [w.id, w]))

    // H1 pre-check: block ANY immutable-field replace (effortType/isExpat/
    // teacher/subs change) against an Accepted (payroll-final) original
    // unless the caller can approve — checked for the WHOLE batch up front
    // so a blocked save never partially executes.
    for (const w of workLogs) {
      if (!w.id) continue
      const original = auditById.get(w.id)
      if (
        original &&
        original.status === WorkLogStatusV2.Accepted &&
        !hasApprove &&
        isImmutableFieldChanged(original, w)
      ) {
        toast.error('This worklog has been approved and can only be changed by an approver.')
        return
      }
    }

    try {
      setSaving(true)
      const currentIds = new Set(
        workLogs.filter((w): w is WorkLogDraft & { id: string } => !!w.id).map((w) => w.id),
      )

      // 1. Rows removed from the draft — delete first (no dependency on later steps).
      const itemsToDelete = workLogsAudit.filter((item) => !currentIds.has(item.id))
      for (const item of itemsToDelete) {
        await deleteWorkLogMutation.mutateAsync({ id: item.id, updatedAt: item.updatedAt })
      }

      // 2. Create / update the remaining rows.
      const processedNewKeys = new Set<string>()
      for (const w of workLogs) {
        if (!w.id) {
          if (!w.effortType) continue // blank draft slot — nothing chosen, skip
          const dedupeKey = `${w.teacherId}-${w.effortType}-${w.subsForTeacherId}-${w.isExpat}`
          if (processedNewKeys.has(dedupeKey)) continue
          processedNewKeys.add(dedupeKey)
          await createEntry(w)
          continue
        }

        const original = auditById.get(w.id)
        if (isImmutableFieldChanged(original, w)) {
          // v2 PUT cannot change effortType/isExpat/teacherId/subsForTeacherId — replace via
          // create-then-delete (in that order: a rejected create never loses the original row).
          const created = await createEntry(w)
          if (original) {
            try {
              await deleteWorkLogMutation.mutateAsync({ id: original.id, updatedAt: original.updatedAt })
            } catch (deleteError) {
              // Paired delete failed (e.g. a concurrent approve flipped this row to
              // Accepted, or a stale token) — roll back the just-created row using its
              // OWN fresh updatedAt so the pair can't leave a duplicate live in the
              // dataset (H1), then surface the original delete error below.
              await deleteWorkLogMutation
                .mutateAsync({ id: created.id, updatedAt: created.updatedAt })
                .catch(() => {
                  // Best-effort: if the rollback delete itself also fails, the original
                  // delete error still surfaces below — a human reconciles the orphan.
                })
              throw deleteError
            }
          }
        } else if (hasWorklogEditableChanges(original!, w)) {
          await updateWorkLogMutation.mutateAsync({
            id: w.id,
            data: { score: w.score, comment: w.comment, evaluate: w.evaluate, order: w.order },
            updatedAt: original!.updatedAt,
          })
        }
      }

      toast.success('Worklog saved successfully')
      setEditing(false)
    } catch (error) {
      if (isApprovedLockedError(error)) {
        toast.error('This worklog has been approved and can only be changed by an approver.')
      } else if (isConcurrencyError(error)) {
        toast.error('This worklog was changed by someone else. Refreshing…')
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to save worklog')
      }
      console.error('Worklog save error:', error)
    } finally {
      setSaving(false)
      // H2: refetch/resync on EVERY save outcome (not just concurrency) so a
      // retry after a partial failure can never re-create rows that already
      // succeeded. M4: ONE invalidation for the whole batch instead of one
      // per mutation (the create/update/delete hooks above were called with
      // invalidateOnSuccess: false for exactly this reason) — covers the
      // lesson-scoped query, which is nested under worklogKeys.lists().
      qc.invalidateQueries({ queryKey: worklogKeys.lists() })
    }
  }, [
    logId,
    workLogs,
    workLogsAudit,
    hasApprove,
    createEntry,
    updateWorkLogMutation,
    deleteWorkLogMutation,
    qc,
  ])

  // ── Loading ───────────────────────────────────────────────────────────
  if (loadingWL || loadingSO) return <WorklogSkeleton />

  // ── Error (M3) — explicit state, never silently treated as "no worklogs" ──
  if (wlError) {
    return (
      <div className="p-4 flex flex-col items-center gap-3 py-8 text-center">
        <AlertTriangle className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground max-w-sm">
          Couldn&apos;t load worklog data for this lesson. You may not have access, or the
          request failed.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchWorkLogs()}
          className="h-7 text-xs gap-1.5"
        >
          Retry
        </Button>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Header with edit/save toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <ClipboardList className="size-3.5" />
          Teacher Worklog
        </h3>
        <div className="flex items-center gap-1.5">
          {editing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={saving}
              className="h-7 text-xs gap-1.5 text-muted-foreground"
            >
              <X className="size-3.5" />
              Cancel
            </Button>
          )}
          <Button
            variant={editing ? 'default' : 'outline'}
            size="sm"
            onClick={editing ? handleSave : () => setEditing(true)}
            disabled={saving || (editing && !workLogs.some((x) => x.effortType))}
            className="h-7 text-xs gap-1.5"
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : editing ? (
              <Save className="size-3.5" />
            ) : (
              <Edit className="size-3.5" />
            )}
            {saving ? 'Saving...' : editing ? 'Save Worklog' : 'Edit'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Main teacher rows */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center h-5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
              Teachers of Class
            </span>
          </div>
          {mainTeacherLogs.map((wl) => {
          const teacher = classTeachers.find((ct) => ct.teacherId === wl.teacherId)
          const isPrimary = teacher?.isPrimary ?? false
          const subsLog = workLogs.find(
            (w) => w.subsForTeacherId === wl.teacherId && !w.isExpat,
          )

          // Determine available options using consolidated filter
          const hasAlone = mainTeacherLogs.some(
            (x) =>
              (x.effortType === ShiftTypeConstant.Alone ||
               x.effortType === ShiftTypeConstant.AloneExpat) &&
              x.teacherId !== wl.teacherId,
          )
          // If any teacher has a role shift (main_teacher/main_full/co_teacher),
          // alone/alone_expat are hidden from all dropdowns
          const ROLE_SHIFTS: string[] = [
            ShiftTypeConstant.MainTeacher,
            ShiftTypeConstant.MainFull,
            ShiftTypeConstant.CoTeacher,
          ]
          const hasRoleShift = mainTeacherLogs.some(
            (x) => ROLE_SHIFTS.includes(x.effortType) && x.teacherId !== wl.teacherId,
          )
          const availableOptions = getFilteredOptions(
            shiftOptions,
            isPrimary,
            hasAlone,
            hasExpat,
            hasRoleShift,
          )

          return (
            <div
              key={wl.teacherId}
              className={cn(
                'rounded-lg border p-3 flex flex-col gap-3 shadow-sm transition-all',
                wl.effortType === ShiftTypeConstant.Off
                  ? 'border-l-4 border-l-muted-foreground/30 border-border'
                  : 'border-l-4 border-l-primary/60 border-border bg-card',
                editing && 'ring-1 ring-ring/20',
              )}
            >
              {/* Teacher row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-9 rounded-full border border-border bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                    {(teacher?.englishName || teacher?.fullName || '?')
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {teacher
                        ? formatTeacherName(teacher)
                        : wl.teacherId.slice(0, 8)}
                    </span>
                    <Badge
                      variant="outline"
                      className="w-fit text-[9px] font-bold uppercase tracking-wide px-1.5 py-0 h-4 mt-0.5"
                    >
                      {isPrimary ? 'Main Teacher' : 'Co-Teacher'}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {editing ? (
                    <Select
                      value={wl.effortType}
                      onValueChange={(v) => onEffortTypeChange(wl.teacherId, v)}
                    >
                      <SelectTrigger size="sm" className="h-7 text-xs w-[160px]">
                        <SelectValue placeholder="Select shift..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary" className="text-xs font-medium">
                      {shiftOptions.find((x) => x.value === wl.effortType)?.label ||
                        wl.effortType || (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                    </Badge>
                  )}

                  {wl.effortType && (
                    <span className="text-xs font-mono tabular-nums text-muted-foreground">
                      {wl.score > 0 ? wl.score.toFixed(1) : '—'}
                    </span>
                  )}
                </div>
              </div>

              {/* Event badge — read-only; server-computed, unknown for unsaved drafts */}
              {wl.id && wl.isEvent && wl.effortType !== ShiftTypeConstant.Off && (
                <div className="flex items-center gap-2 pl-12">
                  <Badge variant="outline" className="gap-1 text-[10px] font-medium text-muted-foreground">
                    <CalendarClock className="size-3" />
                    Event{wl.eventTime > 0 ? ` · ${wl.eventTime.toFixed(1)}h` : ''}
                  </Badge>
                </div>
              )}

              {/* Substitute row (when teacher is off AND not forced by alone) */}
              {wl.effortType === ShiftTypeConstant.Off && !hasAlone && (
                <div className="ml-6 pl-6 border-l-2 border-dashed border-border flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">
                    Substitute Teacher
                  </span>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    {editing ? (
                      <>
                        <TeacherCombobox
                          teachers={allTeachersForSubs}
                          value={subsLog?.teacherId ?? ''}
                          onChange={(id) =>
                            onSubstituteChange(wl.teacherId, 'teacherId', id)
                          }
                          label="Subs Teacher"
                        />
                        <Select
                          value={subsLog?.effortType ?? ''}
                          onValueChange={(v) =>
                            onSubstituteChange(wl.teacherId, 'effortType', v)
                          }
                        >
                          <SelectTrigger
                            size="sm"
                            className="h-7 text-xs w-[160px]"
                          >
                            <SelectValue placeholder="Shift..." />
                          </SelectTrigger>
                          <SelectContent>
                            {getFilteredOptions(
                              shiftOptions.filter(
                                (x) => x.value !== ShiftTypeConstant.Off,
                              ),
                              isPrimary,
                              false,
                              hasExpat,
                              false,
                            ).map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    ) : subsLog ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground">
                          {allTeachersRaw.find(
                            (t) => t.id === subsLog.teacherId,
                          )
                            ? (() => {
                                const t = allTeachersRaw.find(
                                  (t) => t.id === subsLog.teacherId,
                                )!
                                return t.englishName
                                  ? `${t.englishName} - ${t.fullName}`
                                  : t.fullName
                              })()
                            : subsLog.teacherId.slice(0, 8)}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {shiftOptions.find(
                            (x) => x.value === subsLog.effortType,
                          )?.label ?? '—'}
                        </Badge>
                        <span className="text-xs font-mono tabular-nums text-muted-foreground">
                          {subsLog.score > 0 ? subsLog.score.toFixed(1) : '—'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/50 italic">
                        No substitute assigned
                      </span>
                    )}
                  </div>
                  {/* Event badge for substitute — read-only, same as the main-row badge above */}
                  {subsLog?.id && subsLog.isEvent && subsLog.effortType && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1 text-[10px] font-medium text-muted-foreground">
                        <CalendarClock className="size-3" />
                        Event{subsLog.eventTime > 0 ? ` · ${subsLog.eventTime.toFixed(1)}h` : ''}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        </div>

        {/* Expat Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 h-5">
            <Checkbox
              id="expat-toggle"
              checked={!!expatLog}
              onCheckedChange={(checked) => onExpatToggle(!!checked)}
              disabled={!editing}
            />
            <label
              htmlFor="expat-toggle"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer"
            >
              Expat Teacher
            </label>
        </div>

        {expatLog && (
          <div
            className={cn(
              'rounded-lg border p-3 flex flex-col gap-3 shadow-sm',
              'border-l-4 border-l-violet-500 border-border',
              editing && 'ring-1 ring-ring/20',
            )}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {editing ? (
                <>
                  <TeacherCombobox
                    teachers={expatTeachers}
                    value={expatLog.teacherId}
                    onChange={(id) => onExpatFieldChange('teacherId', id)}
                    label="Teacher"
                  />
                  <Select
                    value={expatLog.effortType}
                    onValueChange={(v) => onExpatFieldChange('effortType', v)}
                  >
                    <SelectTrigger size="sm" className="h-7 text-xs w-[160px]">
                      <SelectValue placeholder="Shift..." />
                    </SelectTrigger>
                    <SelectContent>
                      {shiftOptions
                        .filter((x) =>
                          EXPAT_OPTIONS.includes(
                            x.value as typeof EXPAT_OPTIONS[number],
                          ),
                        )
                        .map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">
                    {allTeachersRaw.find(
                      (t) => t.id === expatLog.teacherId,
                    )
                      ? (() => {
                          const t = allTeachersRaw.find(
                            (t) => t.id === expatLog.teacherId,
                          )!
                          return t.englishName
                            ? `${t.englishName} - ${t.fullName}`
                            : t.fullName
                        })()
                      : expatLog.teacherId
                        ? expatLog.teacherId.slice(0, 8)
                        : '—'}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {shiftOptions.find((x) => x.value === expatLog.effortType)
                      ?.label ?? '—'}
                  </Badge>
                </div>
              )}
              <span className="text-xs font-mono tabular-nums text-muted-foreground">
                {expatLog.score > 0 ? expatLog.score.toFixed(1) : '—'}
              </span>
            </div>

            {/* Evaluate checkbox — Amendment 2 exposes `evaluate` on reads, so this
                reflects the loaded row's actual saved value (see `toDraft`). */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="expat-evaluate"
                checked={expatLog.evaluate}
                onCheckedChange={(checked) =>
                  onExpatFieldChange('evaluate', !!checked)
                }
                disabled={!editing}
              />
              <label
                htmlFor="expat-evaluate"
                className="text-xs text-muted-foreground cursor-pointer"
              >
                Evaluate the expat lesson
              </label>
            </div>

            {/* Comment */}
            {editing ? (
              <Textarea
                value={expatLog.comment ?? ''}
                onChange={(e) => onExpatFieldChange('comment', e.target.value)}
                rows={3}
                placeholder="Enter notes..."
                className="text-sm resize-none"
              />
            ) : expatLog.comment ? (
              <div className="text-sm leading-relaxed px-3 py-2 rounded-md border bg-muted/30 border-border text-foreground/85">
                {expatLog.comment}
              </div>
            ) : (
              <div className="text-sm leading-relaxed px-3 py-2 rounded-md border bg-muted/10 border-border/40 text-muted-foreground/50 italic">
                No comment provided.
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TeacherCombobox — shadcn Command-in-Popover pattern
// ---------------------------------------------------------------------------

function TeacherCombobox({
  teachers,
  value,
  onChange,
  label,
}: {
  teachers: AllTeacher[]
  value: string
  onChange: (id: string) => void
  label: string
}) {
  const [open, setOpen] = useState(false)
  const selected = teachers.find((t) => t.id === value)

  const formatName = (t: AllTeacher) =>
    t.englishName ? `${t.englishName} - ${t.fullName}` : t.fullName

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className="h-7 w-[200px] justify-between text-xs font-normal"
        >
          {selected ? formatName(selected) : label}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search teacher..." className="h-8" />
          <CommandList>
            <CommandEmpty>No teacher found.</CommandEmpty>
            <CommandGroup>
              {teachers.map((t) => (
                <CommandItem
                  key={t.id}
                  value={formatName(t)}
                  onSelect={() => {
                    onChange(t.id)
                    setOpen(false)
                  }}
                >
                  {formatName(t)}
                  <Check
                    className={cn(
                      'ml-auto',
                      value === t.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// WorklogSkeleton
// ---------------------------------------------------------------------------

function WorklogSkeleton() {
  return (
    <div className="p-4 flex flex-col gap-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border p-3 flex flex-col gap-2.5">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-32 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
            <Skeleton className="h-7 w-[140px] rounded ml-auto" />
          </div>
        </div>
      ))}
      <Skeleton className="h-px w-full" />
      <Skeleton className="h-4 w-24 rounded" />
    </div>
  )
}
