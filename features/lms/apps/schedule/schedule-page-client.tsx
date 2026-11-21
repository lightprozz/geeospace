'use client'
// ---------------------------------------------------------------------------
// _components/schedule-page-client.tsx
// Main client shell for Schedule Management
// Table pattern: client-side search/sort/filter via useClientTable
// ---------------------------------------------------------------------------

import { useState, useMemo, useCallback } from 'react'
import type { DesktopAppId } from '@/lib/desktop/apps'
import { Plus, Search, CalendarDays } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import { useScheduleStore } from '@/features/lms/stores/use-schedule-store'
import { useAllSchedules, useDeleteSchedule } from '@/features/lms/hooks/schedule/use-schedules'
import { useAllClasses } from '@/features/lms/hooks/classes/use-classes'
import { useClientTable, type ClientSort } from '@/hooks/use-client-table'
import type { Schedule } from '@/features/lms/types/schedule'
import { usePermission } from '@/components/auth/permission-guard'
import { PERMISSIONS } from '@/lib/permissions'
import { ScheduleTable } from './schedule-table'
import { ScheduleUpsertDialog } from './schedule-upsert-dialog'
import { SelectClassDialog } from './select-class-dialog'
import { SelectRoomDialog } from './select-room-dialog'

// ---------------------------------------------------------------------------
// Schedule with Record constraint for useClientTable
// ---------------------------------------------------------------------------
type ScheduleRecord = Schedule & Record<string, unknown>

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SchedulePageClient({ onOpen }: { onOpen: (id: DesktopAppId) => void }) {
  // ── Permissions ────────────────────────────────────────────────
  const { can } = usePermission()
  const canManageSchedule = can(PERMISSIONS.CLASS_SCHEDULE)

  // ── State ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'active' | 'expired'>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(null)

  // ── Pagination & Sort state (client-side) ──────────────────────
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(20)
  const [sort, setSort] = useState<ClientSort<ScheduleRecord> | null>(null)

  // ── Data — fetch ALL schedules (1 API call) ────────────────────
  const containsEndClass: 0 | 1 = activeTab === 'expired' ? 1 : 0
  const { data: rawSchedules = [], isLoading } = useAllSchedules(containsEndClass)

  // Fetch ALL active classes to map campusName (Schedule API may return null)
  const { data: rawClasses = [] } = useAllClasses(0)

  // Client-side campusName mapping
  const schedules: ScheduleRecord[] = useMemo(() => {
    return rawSchedules.map((s) => {
      if (!s.campusName && s.classCourseId && rawClasses.length > 0) {
        const matchedClass = rawClasses.find((c) => c.id === s.classCourseId)
        if (matchedClass?.campusName) {
          return { ...s, campusName: matchedClass.campusName } as ScheduleRecord
        }
      }
      return s as ScheduleRecord
    })
  }, [rawSchedules, rawClasses])

  // ── Client-side table processing ──────────────────────────────
  const table = useClientTable<ScheduleRecord>({
    data: schedules,
    searchFields: ['name', 'classCourseName', 'classRoomName', 'campusName'] as (keyof ScheduleRecord)[],
    searchQuery,
    sort,
    sortStorageKey: 'schedule-table-sort',
    onSortChange: setSort,
    defaultSort: { field: 'name' as keyof ScheduleRecord, desc: false },
    page,
    pageSize,
  })

  // ── Mutations ──────────────────────────────────────────────────
  const deleteMutation = useDeleteSchedule()

  // ── Store actions ──────────────────────────────────────────────
  const openCreateSchedule = useScheduleStore((s) => s.openCreateSchedule)
  const openEditSchedule = useScheduleStore((s) => s.openEditSchedule)
  const openClassDialog = useScheduleStore((s) => s.openClassDialog)
  const openRoomDialog = useScheduleStore((s) => s.openRoomDialog)

  // ── Inject breadcrumb + actions into shared header ─────────────
  const headerActions = (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <button onClick={() => onOpen("lms-timetable")}>
            <CalendarDays className="mr-1.5 h-4 w-4" />
            View Timetable
          </button>
        </Button>
        {canManageSchedule && (
          <Button size="sm" onClick={openCreateSchedule}>
            <Plus className="mr-1.5 h-4 w-4" />
            Set Schedule
          </Button>
        )}
      </div>
    )


  // ── Sort handler — toggle: none → asc → desc → none ───────────
  const handleSortChange = useCallback(
    (field: string) => {
      const f = field as keyof ScheduleRecord
      if (sort?.field === f) {
        if (sort.desc) {
          setSort(null)
        } else {
          setSort({ field: f, desc: true })
        }
      } else {
        setSort({ field: f, desc: false })
      }
      setPage(1)
    },
    [sort],
  )

  // ── Tab change handler ─────────────────────────────────────────
  function handleTabChange(tab: string) {
    setActiveTab(tab as 'active' | 'expired')
    setSearchQuery('')
    setPage(1)
    setSort(null)
  }

  // ── Delete handler ─────────────────────────────────────────────
  function handleConfirmDelete() {
    if (!scheduleToDelete) return
    deleteMutation.mutate(scheduleToDelete.id, {
      onSettled: () => setScheduleToDelete(null),
    })
  }

  // ── Table props (shared between both tabs) ─────────────────────
  const tableProps = {
    items: table.items as Schedule[],
    totalFiltered: table.totalFiltered,
    isLoading,
    onEdit: (s: Schedule) => openEditSchedule(s.id),
    onDelete: setScheduleToDelete,
    onAssignClass: (s: Schedule) => openClassDialog(s.id),
    onAssignRoom: (s: Schedule) => openRoomDialog(s.id, s.classRoomName),
    page: table.page,
    pageSize: table.pageSize,
    totalPages: table.totalPages,
    rangeStart: table.rangeStart,
    rangeEnd: table.rangeEnd,
    onPageChange: setPage,
    onPageSizeChange: (size: number) => {
      setPageSize(size)
      setPage(1)
    },
    sortField: sort?.field as string | undefined,
    sortDesc: sort?.desc ?? false,
    onSortChange: handleSortChange,
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-3"><h1 className="text-base font-semibold">Schedule Management</h1>{headerActions}</header>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="flex flex-col h-full"
          >
            {/* Tab bar + search */}
            <div className="px-4 pt-3 pb-2 space-y-2 border-b shrink-0">
              <div className="flex items-center gap-3">
                <TabsList className="h-8">
                  <TabsTrigger
                    value="active"
                    className="text-xs h-7 px-3"
                  >
                    Active Schedules
                  </TabsTrigger>
                  <TabsTrigger
                    value="expired"
                    className="text-xs h-7 px-3"
                  >
                    Expired Schedules
                  </TabsTrigger>
                </TabsList>

                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search schedules, class, room..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setPage(1)
                    }}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Table — same content for both tabs, data changes via hook */}
            <TabsContent
              value="active"
              className="flex-1 overflow-hidden m-0 h-full data-[state=active]:flex data-[state=active]:flex-col"
            >
              <ScheduleTable {...tableProps} />
            </TabsContent>

            <TabsContent
              value="expired"
              className="flex-1 overflow-hidden m-0 h-full data-[state=active]:flex data-[state=active]:flex-col"
            >
              <ScheduleTable {...tableProps} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ── Delete Confirmation Dialog ──────────────────────────── */}
      <AlertDialog
        open={!!scheduleToDelete}
        onOpenChange={(open) => !open && setScheduleToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong>{scheduleToDelete?.name}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Dialogs ────────────────────────────────────────────── */}
      <ScheduleUpsertDialog />
      <SelectClassDialog />
      <SelectRoomDialog rooms={[]} />
    </div>
  )
}
