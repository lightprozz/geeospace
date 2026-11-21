'use client'
// ---------------------------------------------------------------------------
// timetable/_components/timetable-page-client.tsx
// Split-pane layout: daily session list (left) + month calendar grid (right)
// Matches TimetableView.tsx mockup
// ---------------------------------------------------------------------------

import { useState, useMemo, useCallback } from 'react'
import type { DesktopAppId } from '@/lib/desktop/apps'
import { ArrowLeft, CalendarDays, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useWindowNavigation } from '@/components/desktop/window-navigation'
import { useAuthStore } from '@/stores/use-auth-store'
import { useCalendarData } from '@/features/lms/hooks/schedule/use-calendar-data'
import { useCampusList } from '@/features/lms/hooks/schedule/use-schedule-lookups'
import { toCalendarSessions, getTimetableClassId } from './calendar-model'
import { SHIFTS } from '@/features/lms/types/schedule'
import { MonthCalendarGrid } from './month-calendar-grid'
import { DailySessionList } from './daily-session-list'

// ---------------------------------------------------------------------------
// Transform API events → CalendarSession[]
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TimetablePageClient({ onOpen }: { onOpen: (id: DesktopAppId) => void }) {
  const today = new Date()

  // ── State ──────────────────────────────────────────────────────
  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  )
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')

  // ── Filters ────────────────────────────────────────────────────
  const { path } = useWindowNavigation()
  const classIdParam = getTimetableClassId(path)
  const [classNameFilter, setClassNameFilter] = useState('')
  const [shiftFilter, setShiftFilter] = useState('all')

  // ── Auth ───────────────────────────────────────────────────────
  const user = useAuthStore((s) => s.user)
  const userId = user?.sub ?? ''

  // ── Data ───────────────────────────────────────────────────────
  // ── Data ───────────────────────────────────────────────────────
  const { data: rawEvents } = useCalendarData({
    mode: classIdParam ? 'class' : 'all',
    id: classIdParam ?? undefined,
  })
  const { data: campuses } = useCampusList(userId)

  // Transform + filter by branch
  // Transform + apply client filters
  const sessions = useMemo(() => {
    if (!rawEvents) return []
    let all = toCalendarSessions(rawEvents)

    if (selectedBranch !== 'all') {
      all = all.filter((s) => s.campusId === selectedBranch)
    }

    if (classNameFilter.trim() !== '') {
      const lower = classNameFilter.toLowerCase()
      all = all.filter((s) => s.className.toLowerCase().includes(lower))
    }

    if (shiftFilter !== 'all') {
      all = all.filter((s) => s.shiftCode === shiftFilter)
    }

    return all
  }, [rawEvents, selectedBranch, classNameFilter, shiftFilter])

  // Sessions for selected day
  const daySessions = useMemo(() => {
    return sessions.filter(
      (s) =>
        s.date.getFullYear() === selectedDate.getFullYear() &&
        s.date.getMonth() === selectedDate.getMonth() &&
        s.date.getDate() === selectedDate.getDate(),
    )
  }, [sessions, selectedDate])

  // ── Navigation ─────────────────────────────────────────────────
  const handlePrevMonth = useCallback(() => {
    setCurrentDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    )
  }, [])

  const handleNextMonth = useCallback(() => {
    setCurrentDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    )
  }, [])

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date)
    // On mobile, switch to list view when a date is tapped
    setViewMode('list')
  }, [])

  const handlePrevDay = useCallback(() => {
    setSelectedDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1),
    )
  }, [])

  const handleNextDay = useCallback(() => {
    setSelectedDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1),
    )
  }, [])

  const handleToday = useCallback(() => {
    const now = new Date()
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDate(now)
  }, [])

  // ── Header ─────────────────────────────────────────────────────
  const backLabel = classIdParam ? 'Classes' : 'Schedule'

  const headerActions = (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <button onClick={() => onOpen(classIdParam ? "lms-classes" : "lms-schedule")}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to {backLabel === 'Schedule' ? 'List' : backLabel}
          </button>
        </Button>
      </div>
    )


  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-3"><h1 className="text-base font-semibold">Timetable</h1>{headerActions}</header>
      {/* Sub-toolbar: filters + navigation + mobile toggle */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b shrink-0">

        {/* Class Name Filter */}
        <Input
          placeholder="Filter class..."
          value={classNameFilter}
          onChange={(e) => setClassNameFilter(e.target.value)}
          className="w-full sm:w-[160px] h-8 text-xs"
        />

        {/* Shift Filter */}
        <Select value={shiftFilter} onValueChange={setShiftFilter}>
          <SelectTrigger className="w-[110px] h-8 text-xs">
            <SelectValue placeholder="All Shifts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Shifts</SelectItem>
            {SHIFTS.map((s) => (
              <SelectItem key={s.code} value={s.code}>
                {s.code} - {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Branch / Campus filter */}
        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="All Branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {(campuses ?? []).map((campus) => (
              <SelectItem key={campus.id} value={campus.id}>
                {campus.address || campus.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {/* Day Navigation */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={handlePrevDay}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs font-medium"
            onClick={handleToday}
          >
            <span className="hidden sm:inline">Today</span>
            <span className="inline sm:hidden">🗓</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={handleNextDay}
          >
            {/* Mirror the ArrowLeft to act as ArrowRight to match Lucide without importing ChevronRight if not needed, wait let's just use CSS transform */}
            <ArrowLeft className="h-4 w-4 rotate-180" />
          </Button>
        </div>

        <div className="flex-1" />

        {/* Mobile view toggle */}
        <div className="flex items-center gap-1 lg:hidden">
          <Button
            variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('calendar')}
          >
            <CalendarDays className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Split pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Daily session list */}
        <div
          className={`w-full lg:w-80 xl:w-96 lg:border-r shrink-0 overflow-hidden ${
            viewMode === 'list' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
          }`}
        >
          <DailySessionList
            selectedDate={selectedDate}
            sessions={daySessions}
          />
        </div>

        {/* Right: Month calendar grid */}
        <div
          className={`flex-1 overflow-hidden ${
            viewMode === 'calendar' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
          }`}
        >
          <MonthCalendarGrid
            currentDate={currentDate}
            selectedDate={selectedDate}
            sessions={sessions}
            onDateSelect={handleDateSelect}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />
        </div>
      </div>
    </div>
  )
}
