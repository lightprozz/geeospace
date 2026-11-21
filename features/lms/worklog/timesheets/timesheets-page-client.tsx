'use client'
// ---------------------------------------------------------------------------
// _components/timesheets-page-client.tsx
// Manager Timesheets grid orchestrator — period/search/filter/group-by state
// (kept LOCAL to this page via useState, per phase-6 file ownership: does
// NOT touch stores/use-worklog-store.ts, owned by the concurrent /worklog
// page phase), full-period all-teachers fetch, grid-model derivation, CSV
// export. Read-only cells + single-entry approve/reject only.
// ---------------------------------------------------------------------------

import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAllTeachers } from '@/features/lms/hooks/classes/use-classes'
import { useShiftOptions } from '@/features/lms/hooks/worklog/use-shift-options'
import { patchTimesheetsGridEntry, useTimesheetsGridData } from '@/features/lms/hooks/worklog/use-timesheets-grid'
import { buildGridModel, serializeGridCsv } from '@/features/lms/lib/worklog/grid-model'
import { dayColumns, periodKeyFor, todayDateKeyInSaigon, type PeriodKey } from '@/features/lms/lib/worklog/payroll-cycle'
import { useAuthStore } from '@/stores/use-auth-store'
import type { WorkLogItemV2 } from '@/features/lms/types/worklog'
import { TimesheetsGrid, TimesheetsGridSkeleton } from './timesheets-grid'
import { TimesheetsToolbar } from './timesheets-toolbar'

function downloadCsv(filename: string, content: string) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function matchesSearch(item: WorkLogItemV2, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    (item.teacherName ?? '').toLowerCase().includes(q) ||
    (item.className ?? '').toLowerCase().includes(q)
  )
}

export function TimesheetsPageClient() {
  const currentUserId = useAuthStore((s) => s.user?.sub) ?? null
  const queryClient = useQueryClient()

  // ── Local UI state (period/search/filters/groupBy) ─────────────────────
  // Default period anchors to the SAME Asia/Ho_Chi_Minh "today" as the My
  // Worklog page (lib/worklog/payroll-cycle.ts) — a browser-local date would
  // default a non-ICT manager to the WRONG payroll period in the 00:00-07:00
  // ICT window, when ICT has already rolled to a new day but the browser's
  // local calendar date hasn't.
  const [periodKey, setPeriodKey] = useState<PeriodKey>(() => periodKeyFor(todayDateKeyInSaigon()))
  const [search, setSearch] = useState('')
  const [effortTypeFilter, setEffortTypeFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [groupByTeacher, setGroupByTeacher] = useState(true)

  const handlePeriodChange = useCallback((next: PeriodKey) => {
    setPeriodKey(next)
    // Reset any period-scoped selection so a stale filter can't silently
    // hide an entire newly-loaded period.
    setClassFilter('')
  }, [])

  const {
    data: allTeachers = [],
    isLoading: teachersLoading,
    isError: teachersError,
    refetch: refetchTeachers,
  } = useAllTeachers()
  const teacherIds = useMemo(() => allTeachers.map((t) => t.id), [allTeachers])

  // ── Data: full-period worklogs across every teacher ─────────────────────
  const {
    data: items = [],
    isLoading: itemsLoading,
    isError: itemsError,
    refetch: refetchGrid,
  } = useTimesheetsGridData(periodKey, teacherIds, { enabled: teacherIds.length > 0 })

  const { data: shiftOptions = [] } = useShiftOptions()
  const effortTypeLabel = useCallback(
    (value: string) => shiftOptions.find((o) => o.value === value)?.label ?? value,
    [shiftOptions],
  )

  // ── Client-side filters (search / effortType / class) — mirrors the
  //    students/materials pages' "fetch all, filter client-side" pattern.
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!matchesSearch(item, search)) return false
      if (effortTypeFilter && item.effortType !== effortTypeFilter) return false
      if (classFilter && item.classId !== classFilter) return false
      return true
    })
  }, [items, search, effortTypeFilter, classFilter])

  // ── Filter dropdown option sources (built from the FULL unfiltered set) ──
  const effortTypeOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { value: string; label: string }[] = []
    for (const item of items) {
      if (!item.effortType || seen.has(item.effortType)) continue
      seen.add(item.effortType)
      opts.push({ value: item.effortType, label: effortTypeLabel(item.effortType) })
    }
    return opts.sort((a, b) => a.label.localeCompare(b.label))
  }, [items, effortTypeLabel])

  const classOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const item of items) {
      if (item.classId && !seen.has(item.classId)) {
        seen.set(item.classId, item.className ?? item.classId.slice(0, 8))
      }
    }
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .filter((c) => c.id) // guard: skip null/undefined/empty classIds
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [items])

  // ── Grid model (pure derivation) — guarded: a data-integrity throw from
  //    buildGridModel (e.g. a row with no lessonStart) must not crash the
  //    page; surface it as an explicit error state instead.
  const { model, modelError } = useMemo(() => {
    try {
      return { model: buildGridModel(filteredItems, periodKey), modelError: null as string | null }
    } catch (err) {
      return {
        model: null,
        modelError: err instanceof Error ? err.message : 'Failed to build the timesheets grid.',
      }
    }
  }, [filteredItems, periodKey])

  const columns = useMemo(() => dayColumns(periodKey), [periodKey])

  const handleExportCsv = useCallback(() => {
    if (!model) return
    const csv = serializeGridCsv(model, columns)
    downloadCsv(`timesheets_${periodKey}.csv`, csv)
  }, [model, columns, periodKey])

  // Approve/reject success: patch the cache in place — no network call —
  // instead of reloading the whole period.
  const handleStatusChanged = useCallback(
    (updated: WorkLogItemV2) => {
      patchTimesheetsGridEntry(queryClient, periodKey, teacherIds, updated)
    },
    [queryClient, periodKey, teacherIds],
  )

  // 409 CONFLICT recovery: the cache may be stale in ways a single-entry
  // patch can't fix, so fall back to a full refetch here only.
  const handleConflict = useCallback(() => {
    refetchGrid()
  }, [refetchGrid])

  const isLoading = teachersLoading || (teacherIds.length > 0 && itemsLoading)
  const isError = teachersError || itemsError

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <h1 className="px-4 pt-3 text-base font-semibold">Timesheets</h1>
      <TimesheetsToolbar
        periodKey={periodKey}
        onPeriodChange={handlePeriodChange}
        search={search}
        onSearchChange={setSearch}
        effortTypeFilter={effortTypeFilter}
        onEffortTypeFilterChange={setEffortTypeFilter}
        effortTypeOptions={effortTypeOptions}
        classFilter={classFilter}
        onClassFilterChange={setClassFilter}
        classOptions={classOptions}
        groupByTeacher={groupByTeacher}
        onGroupByTeacherChange={setGroupByTeacher}
        onExportCsv={handleExportCsv}
        exportDisabled={isLoading || isError || !model || model.rows.length === 0}
        rowCount={model?.rows.length ?? 0}
        grandTotal={model?.grandTotal ?? 0}
      />

      {isLoading ? (
        <TimesheetsGridSkeleton />
      ) : isError ? (
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground max-w-sm">
              Couldn&apos;t load timesheets for this period. You may not have access, or the
              request failed.
            </p>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
              if (teachersError) void refetchTeachers()
              if (itemsError) void refetchGrid()
            }}>
              Retry
            </Button>
          </div>
        </div>
      ) : modelError ? (
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground max-w-md">{modelError}</p>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => refetchGrid()}>
              Retry
            </Button>
          </div>
        </div>
      ) : model ? (
        <TimesheetsGrid
          model={model}
          columns={columns}
          groupByTeacher={groupByTeacher}
          effortTypeLabel={effortTypeLabel}
          currentUserId={currentUserId}
          canApprove={true}
          onStatusChanged={handleStatusChanged}
          onConflict={handleConflict}
        />
      ) : null}
    </div>
  )
}
