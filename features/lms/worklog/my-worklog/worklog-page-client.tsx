'use client'
// ---------------------------------------------------------------------------
// _components/worklog-page-client.tsx
// Main client shell for the My Worklog page (read-only worklogs/attendance +
// check-in/out). Pattern: schedule-page-client.tsx anatomy.
//
// All server-state queries below are SELF-scoped (no `ownerId` param) — that
// is what keeps them from ever needing `worklog.approve` or 403ing a plain
// Teacher; the Timesheets grid (phase 6) is the ownerId-aware surface.
// ---------------------------------------------------------------------------

import { useEffect, useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { dayColumns, periodRange } from '@/features/lms/lib/worklog/payroll-cycle'
import { useAttendanceMe } from '@/features/lms/hooks/worklog/use-attendance'
import { useShiftOptions } from '@/features/lms/hooks/worklog/use-shift-options'
import { useWorkLogSummary, useWorkLogsQuery } from '@/features/lms/hooks/worklog/use-worklogs'
import {
  useWorklogPeriod,
  useWorklogStore,
  useWorklogTab,
  type WorklogTab,
} from '@/features/lms/stores/use-worklog-store'
import type { AttendanceItem, ShiftOption, WorkLogItemV2 } from '@/features/lms/types/worklog'

import { CheckInOutCard } from './check-in-out-card'
import { PeriodSelector } from './period-selector'
import { WorklogCalendarTab } from './worklog-calendar-tab'
import { WorklogLedgerTab } from './worklog-ledger-tab'
import { WorklogSummaryBar } from './worklog-summary-bar'

// A single teacher's single ~30-day period is orders of magnitude below the
// contract's 2000-row cap — unlike the Timesheets grid (which aggregates
// every teacher and asserts hasNext===false), no pagination UI is needed
// here; one page comfortably covers the whole period.
const WORKLOG_PAGE_SIZE = 2000

export function WorklogPageClient() {
  const { periodKey, setPeriodKey } = useWorklogPeriod()
  const { activeTab, setActiveTab } = useWorklogTab()

  const { from, to } = useMemo(() => periodRange(periodKey), [periodKey])
  const columns = useMemo(() => dayColumns(periodKey), [periodKey])

  const worklogsQuery = useWorkLogsQuery({ from, to, pageSize: WORKLOG_PAGE_SIZE })
  const attendanceQuery = useAttendanceMe(from, to)
  const summaryQuery = useWorkLogSummary({ from, to })
  const { data: shiftOptions = [] } = useShiftOptions()

  const shiftOptionsMap = useMemo(() => {
    const map = new Map<string, ShiftOption>()
    for (const opt of shiftOptions) map.set(opt.value, opt)
    return map
  }, [shiftOptions])

  const worklogsByDate = useMemo(() => {
    const map = new Map<string, WorkLogItemV2[]>()
    for (const wl of worklogsQuery.data?.items ?? []) {
      if (!wl.lessonStart) continue
      const dateKey = wl.lessonStart.slice(0, 10)
      const bucket = map.get(dateKey)
      if (bucket) bucket.push(wl)
      else map.set(dateKey, [wl])
    }
    return map
  }, [worklogsQuery.data])

  const attendanceByDate = useMemo(() => {
    const map = new Map<string, AttendanceItem[]>()
    for (const row of attendanceQuery.data ?? []) {
      if (!row.checkInTime) continue
      const dateKey = row.checkInTime.slice(0, 10)
      const bucket = map.get(dateKey)
      if (bucket) bucket.push(row)
      else map.set(dateKey, [row])
    }
    return map
  }, [attendanceQuery.data])

  // Reset store on unmount (per rules/02-state-management.md) — re-anchors
  // to the CURRENT period next visit instead of leaving a stale browsed one.
  useEffect(() => {
    return () => {
      useWorklogStore.getState().reset()
    }
  }, [])

  const isError = worklogsQuery.isError || attendanceQuery.isError
  const isLoading = (worklogsQuery.isLoading || attendanceQuery.isLoading) && !isError

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-col gap-3 border-b px-4 py-3">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-base font-semibold">My Worklog</h1>
          <PeriodSelector periodKey={periodKey} onChange={setPeriodKey} />
        </header>
        <CheckInOutCard />
        <WorklogSummaryBar
          summary={summaryQuery.data}
          isLoading={summaryQuery.isLoading}
          isError={summaryQuery.isError}
        />
      </div>

      {isError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
          <AlertTriangle className="size-6 text-muted-foreground" />
          <p className="max-w-sm text-sm text-muted-foreground">
            Couldn&apos;t load your worklog data for this period. Please try again.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => {
              worklogsQuery.refetch()
              attendanceQuery.refetch()
            }}
          >
            Retry
          </Button>
        </div>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as WorklogTab)}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="shrink-0 px-4 pt-3 pb-2">
            <TabsList className="h-8">
              <TabsTrigger value="calendar" className="h-7 px-3 text-xs">
                Calendar
              </TabsTrigger>
              <TabsTrigger value="ledger" className="h-7 px-3 text-xs">
                Ledger
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="calendar"
            className="m-0 h-full flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
          >
            <WorklogCalendarTab
              columns={columns}
              worklogsByDate={worklogsByDate}
              attendanceByDate={attendanceByDate}
              shiftOptionsMap={shiftOptionsMap}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent
            value="ledger"
            className="m-0 h-full flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
          >
            <WorklogLedgerTab
              columns={columns}
              worklogsByDate={worklogsByDate}
              attendanceByDate={attendanceByDate}
              shiftOptionsMap={shiftOptionsMap}
              isLoading={isLoading}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
