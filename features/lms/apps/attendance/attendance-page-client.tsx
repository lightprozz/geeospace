'use client'
// ---------------------------------------------------------------------------
// app/(dashboard)/attendance/_components/attendance-page-client.tsx
// Main client orchestrator for the Attendance & Catch-up page
// Pattern: identical to schedule-page-client.tsx
// ---------------------------------------------------------------------------

import { useEffect } from 'react'
import { Plus, CalendarPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/use-auth-store'
import {
  useEventDialog,
  useCatchUpDialog,
  useAttendanceFilters,
  useAttendanceStore,
} from '@/features/lms/stores/use-attendance-store'
import { usePermission } from '@/components/auth/permission-guard'
import { PERMISSIONS } from '@/lib/permissions'

import { AbsentStudentsPanel } from './absent-students-panel'
import { EventsTablePanel } from './events-table-panel'
import { EventUpsertDialog } from './event-upsert-dialog'
import { CatchUpUpsertDialog } from './catch-up-upsert-dialog'

export function AttendancePageClient() {
  const user = useAuthStore((s) => s.user)
  const teacherId = user?.sub

  const { can } = usePermission()
  const canCreateCatchUp = can(PERMISSIONS.ATTENDANCE_CATCHUP_WRITE)
  const canCreateEvent = can(PERMISSIONS.ATTENDANCE_EVENT_WRITE)

  const { openCreateEvent } = useEventDialog()
  const { openCreateCatchUp } = useCatchUpDialog()
  const { dateRange } = useAttendanceFilters()

  // Inject breadcrumbs + action buttons into shared dashboard header
  const headerActions = (canCreateCatchUp || canCreateEvent) ? (
      <div className="flex items-center gap-2">
        {canCreateCatchUp && (
          <Button size="sm" variant="outline" onClick={() => openCreateCatchUp()}>
            <CalendarPlus className="mr-1.5 h-4 w-4" />
            New Catch-up
          </Button>
        )}
        {canCreateEvent && (
          <Button size="sm" onClick={openCreateEvent}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Event
          </Button>
        )}
      </div>
    ) : undefined


  // Reset store on unmount (per rules/02-state-management.md)
  useEffect(() => {
    return () => {
      useAttendanceStore.getState().reset()
    }
  }, [])

  return (
    <div className="flex-1 overflow-auto min-h-0">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-3"><h1 className="text-base font-semibold">Attendance & Catch-up</h1>{headerActions}</header>
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 p-4">
        {/* Left column — 1/4 width: Absent Students */}
        <div className="xl:col-span-1">
          <AbsentStudentsPanel teacherId={teacherId} dateRange={dateRange} />
        </div>

        {/* Right column — 3/4 width: Events Table */}
        <div className="xl:col-span-3">
          <EventsTablePanel />
        </div>
      </div>

      {/* Dialogs (portaled via shadcn Dialog) */}
      <EventUpsertDialog />
      <CatchUpUpsertDialog teacherId={teacherId} />
    </div>
  )
}
