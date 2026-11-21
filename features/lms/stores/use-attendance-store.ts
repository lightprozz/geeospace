'use client'
// ---------------------------------------------------------------------------
// stores/use-attendance-store.ts
// Zustand store for Attendance & Catch-Up module UI state
// CLIENT-ONLY — do NOT import in Server Components
// Follows pattern from stores/use-schedule-store.ts
// ---------------------------------------------------------------------------

import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Calculate current week's Tuesday–Sunday range (ISO date strings) */
function getCurrentWeekRange(): { start: string; end: string } {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sun, 1 = Mon, ... 6 = Sat

  // Calculate Tuesday
  const tuesday = new Date(now)
  const diffToTuesday = dayOfWeek >= 2 ? dayOfWeek - 2 : dayOfWeek + 5
  tuesday.setDate(now.getDate() - diffToTuesday)

  // Calculate Sunday
  const sunday = new Date(tuesday)
  sunday.setDate(tuesday.getDate() + 5)

  const format = (d: Date) => d.toISOString().split('T')[0]
  return { start: format(tuesday), end: format(sunday) }
}

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface AttendanceState {
  // Date range filter (defaults to Tu–Sun of current week)
  dateRange: { start: string; end: string }

  // SingleLesson (Event) CRUD dialog
  eventDialog: {
    open: boolean
    mode: 'create' | 'edit'
    editingId?: string
  }

  // CatchUp CRUD dialog
  catchUpDialog: {
    open: boolean
    mode: 'create' | 'edit'
    editingId?: string
    preSelectedStudentName?: string
  }

  // Filter toggles
  showArchived: boolean
  searchQuery: string
}

interface AttendanceActions {
  // Date range
  setDateRange: (range: { start: string; end: string }) => void

  // Event dialog actions
  openCreateEvent: () => void
  openEditEvent: (id: string) => void
  closeEventDialog: () => void

  // CatchUp dialog actions
  openCreateCatchUp: (preSelectedStudentName?: string) => void
  openEditCatchUp: (id: string) => void
  closeCatchUpDialog: () => void

  // Filter actions
  toggleShowArchived: () => void
  setSearchQuery: (query: string) => void

  // Module cleanup (per rules/02-state-management.md)
  reset: () => void
}

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

const defaultState: AttendanceState = {
  dateRange: getCurrentWeekRange(),
  eventDialog: { open: false, mode: 'create' },
  catchUpDialog: { open: false, mode: 'create' },
  showArchived: false,
  searchQuery: '',
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useAttendanceStore = create<AttendanceState & AttendanceActions>()(
  (set) => ({
    ...defaultState,

    // Date range
    setDateRange: (range) => set({ dateRange: range }),

    // Event dialog
    openCreateEvent: () =>
      set({
        eventDialog: { open: true, mode: 'create', editingId: undefined },
      }),

    openEditEvent: (id: string) =>
      set({
        eventDialog: { open: true, mode: 'edit', editingId: id },
      }),

    closeEventDialog: () =>
      set({
        eventDialog: { open: false, mode: 'create', editingId: undefined },
      }),

    // CatchUp dialog
    openCreateCatchUp: (preSelectedStudentName?: string) =>
      set({
        catchUpDialog: {
          open: true,
          mode: 'create',
          editingId: undefined,
          preSelectedStudentName,
        },
      }),

    openEditCatchUp: (id: string) =>
      set({
        catchUpDialog: {
          open: true,
          mode: 'edit',
          editingId: id,
          preSelectedStudentName: undefined,
        },
      }),

    closeCatchUpDialog: () =>
      set({
        catchUpDialog: {
          open: false,
          mode: 'create',
          editingId: undefined,
          preSelectedStudentName: undefined,
        },
      }),

    // Filters
    toggleShowArchived: () =>
      set((state) => ({ showArchived: !state.showArchived })),
    setSearchQuery: (query: string) => set({ searchQuery: query }),

    // Reset all state (called on module unmount)
    reset: () => set({ ...defaultState }),
  }),
)

// ---------------------------------------------------------------------------
// Typed selectors — plain functions, NOT hooks
// ---------------------------------------------------------------------------

const eventDialogSelector = (s: AttendanceState & AttendanceActions) => ({
  eventDialog: s.eventDialog,
  openCreateEvent: s.openCreateEvent,
  openEditEvent: s.openEditEvent,
  closeEventDialog: s.closeEventDialog,
})

const catchUpDialogSelector = (s: AttendanceState & AttendanceActions) => ({
  catchUpDialog: s.catchUpDialog,
  openCreateCatchUp: s.openCreateCatchUp,
  openEditCatchUp: s.openEditCatchUp,
  closeCatchUpDialog: s.closeCatchUpDialog,
})

const filtersSelector = (s: AttendanceState & AttendanceActions) => ({
  dateRange: s.dateRange,
  setDateRange: s.setDateRange,
  showArchived: s.showArchived,
  toggleShowArchived: s.toggleShowArchived,
  searchQuery: s.searchQuery,
  setSearchQuery: s.setSearchQuery,
})

// ---------------------------------------------------------------------------
// Custom hooks — useShallow called correctly INSIDE hook functions
// ---------------------------------------------------------------------------

/** Hook: Subscribe to event CRUD dialog state */
export function useEventDialog() {
  return useAttendanceStore(useShallow(eventDialogSelector))
}

/** Hook: Subscribe to catch-up CRUD dialog state */
export function useCatchUpDialog() {
  return useAttendanceStore(useShallow(catchUpDialogSelector))
}

/** Hook: Subscribe to list filter state */
export function useAttendanceFilters() {
  return useAttendanceStore(useShallow(filtersSelector))
}
