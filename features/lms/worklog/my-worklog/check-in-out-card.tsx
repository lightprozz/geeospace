'use client'
// ---------------------------------------------------------------------------
// _components/check-in-out-card.tsx
// Today's check-in/out state + live clock. Self-contained: fetches its OWN
// "today" attendance window independent of whichever payroll period the
// rest of the page is browsing (today's shift is always "now", not tied to
// the currently selected period).
//
// Hidden entirely when the caller lacks `workingtime.checkin` — the v2
// check-in/out endpoints require that permission separately from
// `worklog.read` (which nav-gates this whole page). Never attempting the
// call when the permission is absent avoids the global api-client 403 →
// /forbidden redirect firing for a widget that's merely not applicable to
// this role, not a real authz error the user should be bounced out for.
//
// No client IP acquisition anywhere in this file — the v2 endpoints derive
// the campus from the server-side connection per the contract.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react'
import { Clock, LogIn, LogOut } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAttendanceMe, useCheckIn, useCheckOut } from '@/features/lms/hooks/worklog/use-attendance'
import { PERMISSIONS } from '@/lib/permissions'
import { useCan } from '@/lib/use-can'
import { todayDateKeyInSaigon } from '@/features/lms/lib/worklog/payroll-cycle'
import type { AttendanceItem } from '@/features/lms/types/worklog'

// workType: 0 Office | 1 HalfDay | 2 Off | 3 Online — verbatim from the v2
// contract (v2-working-time-contract.md); no v1/old-app label precedent
// found in-repo, so these are used as-is rather than invented.
const WORK_TYPE_LABELS: Record<number, string> = {
  0: 'Office',
  1: 'Half Day',
  2: 'Off',
  3: 'Online',
}

/**
 * BE returns naive local timestamps already bucketed to Asia/Saigon (no zone
 * suffix — see the contract's "Canonical work-date & timezone" section).
 * Anchor explicitly to +07:00 (Indochina Time, no DST) so elapsed-time math
 * stays correct regardless of the browser's own timezone — `Date.now()`
 * below is a real, environment-correct instant, and naively parsing a
 * zone-less string would silently interpret it as browser-local time
 * instead, skewing the delta by the TZ offset.
 */
function parseServerInstant(iso: string): number {
  const hasOffset = /[zZ]|[+-]\d{2}:\d{2}$/.test(iso)
  return new Date(hasOffset ? iso : `${iso}+07:00`).getTime()
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const s = String(totalSeconds % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function findOpenEntry(rows: AttendanceItem[]): AttendanceItem | null {
  const open = rows.filter((r) => !r.checkOutTime && r.checkInTime)
  if (open.length === 0) return null
  return open.reduce((latest, r) =>
    parseServerInstant(r.checkInTime!) > parseServerInstant(latest.checkInTime!) ? r : latest,
  )
}

function findLastCompleted(rows: AttendanceItem[]): AttendanceItem | null {
  const done = rows.filter((r) => r.checkOutTime)
  if (done.length === 0) return null
  return done.reduce((latest, r) =>
    parseServerInstant(r.checkOutTime!) > parseServerInstant(latest.checkOutTime!) ? r : latest,
  )
}

export function CheckInOutCard() {
  const hasCheckin = useCan(PERMISSIONS.WORKINGTIME_CHECKIN)

  const todayKey = todayDateKeyInSaigon()
  const attendanceQuery = useAttendanceMe(todayKey, todayKey, { enabled: hasCheckin })
  const checkInMutation = useCheckIn()
  const checkOutMutation = useCheckOut()

  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const openEntry = useMemo(
    () => findOpenEntry(attendanceQuery.data ?? []),
    [attendanceQuery.data],
  )
  const lastCompleted = useMemo(
    () => findLastCompleted(attendanceQuery.data ?? []),
    [attendanceQuery.data],
  )

  // Hooks above must run unconditionally (rules of hooks) — bail out of
  // rendering only after they're all called.
  if (!hasCheckin) return null

  const isCheckedIn = !!openEntry
  const elapsedMs = isCheckedIn ? now - parseServerInstant(openEntry.checkInTime!) : 0
  const mutationPending = checkInMutation.isPending || checkOutMutation.isPending
  // `isFetching` (not just `isLoading`) covers the post-mutation invalidation
  // refetch window too — `isLoading` is only true for the very first fetch
  // (no cached data yet), so relying on it alone re-enables the buttons
  // while the post-check-in/out refetch is still in flight, opening a
  // window for a fast second click to fire a duplicate check-in/out.
  const buttonsDisabled = mutationPending || attendanceQuery.isFetching || attendanceQuery.isError
  const liveClock = new Date(now).toLocaleTimeString('en-US', { hour12: false })

  return (
    <Card size="sm">
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="flex items-center gap-1.5 font-mono text-lg font-semibold tabular-nums text-foreground">
              <Clock className="size-4 text-muted-foreground" />
              {liveClock}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {attendanceQuery.isError ? 'Could not load your check-in status' : isCheckedIn ? `Elapsed ${formatElapsed(elapsedMs)}` : 'Not checked in today'}
            </span>
          </div>

          {attendanceQuery.isLoading ? (
            <Skeleton className="h-5 w-20 rounded-full" />
          ) : isCheckedIn ? (
            <Badge className="border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              Checked In
            </Badge>
          ) : lastCompleted ? (
            <Badge variant="outline" className="gap-1">
              {WORK_TYPE_LABELS[lastCompleted.workType] ?? `Type ${lastCompleted.workType}`} ·{' '}
              {lastCompleted.workHours.toFixed(1)}h
            </Badge>
          ) : null}
        </div>

        {attendanceQuery.isError ? (
          <Button size="sm" variant="outline" onClick={() => void attendanceQuery.refetch()}>
            Retry check-in status
          </Button>
        ) : isCheckedIn ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-xs"
            disabled={buttonsDisabled}
            onClick={() => checkOutMutation.mutate()}
          >
            <LogOut className="size-3.5" />
            {checkOutMutation.isPending ? 'Checking out…' : 'Check Out'}
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-7 gap-1.5 text-xs"
            disabled={buttonsDisabled}
            onClick={() => checkInMutation.mutate()}
          >
            <LogIn className="size-3.5" />
            {checkInMutation.isPending ? 'Checking in…' : 'Check In'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
