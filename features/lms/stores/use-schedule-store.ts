'use client'
// ---------------------------------------------------------------------------
// stores/use-schedule-store.ts
// Zustand store for Schedule module UI state
// CLIENT-ONLY — do NOT import in Server Components
// Follows pattern from stores/use-curriculum-store.ts
// ---------------------------------------------------------------------------

import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface ScheduleState {
  // Schedule CRUD dialog
  scheduleDialog: {
    open: boolean
    mode: 'create' | 'edit'
    editingId?: string
  }

  // Select Class assignment dialog
  classDialog: {
    open: boolean
    targetScheduleId: string | null
  }

  // Select Room assignment dialog
  roomDialog: {
    open: boolean
    targetScheduleId: string | null
    currentRoom: string | null
  }

  // List filters
  containsEndClass: 0 | 1
  searchQuery: string
}

interface ScheduleActions {
  // Schedule dialog actions
  openCreateSchedule: () => void
  openEditSchedule: (id: string) => void
  closeScheduleDialog: () => void

  // Class dialog actions
  openClassDialog: (scheduleId: string) => void
  closeClassDialog: () => void

  // Room dialog actions
  openRoomDialog: (scheduleId: string, currentRoom?: string | null) => void
  closeRoomDialog: () => void

  // Filter actions
  setContainsEndClass: (value: 0 | 1) => void
  setSearchQuery: (query: string) => void

  // Module cleanup (per rules/02-state-management.md)
  reset: () => void
}

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

const defaultState: ScheduleState = {
  scheduleDialog: { open: false, mode: 'create' },
  classDialog: { open: false, targetScheduleId: null },
  roomDialog: { open: false, targetScheduleId: null, currentRoom: null },
  containsEndClass: 0,
  searchQuery: '',
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useScheduleStore = create<ScheduleState & ScheduleActions>()(
  (set) => ({
    ...defaultState,

    // Schedule dialog
    openCreateSchedule: () =>
      set({
        scheduleDialog: { open: true, mode: 'create', editingId: undefined },
      }),

    openEditSchedule: (id: string) =>
      set({
        scheduleDialog: { open: true, mode: 'edit', editingId: id },
      }),

    closeScheduleDialog: () =>
      set({
        scheduleDialog: { open: false, mode: 'create', editingId: undefined },
      }),

    // Class dialog
    openClassDialog: (scheduleId: string) =>
      set({
        classDialog: { open: true, targetScheduleId: scheduleId },
      }),

    closeClassDialog: () =>
      set({
        classDialog: { open: false, targetScheduleId: null },
      }),

    // Room dialog
    openRoomDialog: (scheduleId: string, currentRoom?: string | null) =>
      set({
        roomDialog: {
          open: true,
          targetScheduleId: scheduleId,
          currentRoom: currentRoom ?? null,
        },
      }),

    closeRoomDialog: () =>
      set({
        roomDialog: { open: false, targetScheduleId: null, currentRoom: null },
      }),

    // Filters
    setContainsEndClass: (value: 0 | 1) => set({ containsEndClass: value }),
    setSearchQuery: (query: string) => set({ searchQuery: query }),

    // Reset all state (called on module unmount)
    reset: () => set({ ...defaultState }),
  }),
)

// ---------------------------------------------------------------------------
// Typed selectors — plain functions, NOT hooks
// ---------------------------------------------------------------------------

const scheduleDialogSelector = (s: ScheduleState & ScheduleActions) => ({
  scheduleDialog: s.scheduleDialog,
  openCreateSchedule: s.openCreateSchedule,
  openEditSchedule: s.openEditSchedule,
  closeScheduleDialog: s.closeScheduleDialog,
})

const classDialogSelector = (s: ScheduleState & ScheduleActions) => ({
  classDialog: s.classDialog,
  openClassDialog: s.openClassDialog,
  closeClassDialog: s.closeClassDialog,
})

const roomDialogSelector = (s: ScheduleState & ScheduleActions) => ({
  roomDialog: s.roomDialog,
  openRoomDialog: s.openRoomDialog,
  closeRoomDialog: s.closeRoomDialog,
})

const filtersSelector = (s: ScheduleState & ScheduleActions) => ({
  containsEndClass: s.containsEndClass,
  searchQuery: s.searchQuery,
  setContainsEndClass: s.setContainsEndClass,
  setSearchQuery: s.setSearchQuery,
})

// ---------------------------------------------------------------------------
// Custom hooks — useShallow called correctly INSIDE hook functions
// ---------------------------------------------------------------------------

/** Hook: Subscribe to schedule CRUD dialog state */
export function useScheduleDialog() {
  return useScheduleStore(useShallow(scheduleDialogSelector))
}

/** Hook: Subscribe to class assignment dialog state */
export function useClassAssignDialog() {
  return useScheduleStore(useShallow(classDialogSelector))
}

/** Hook: Subscribe to room assignment dialog state */
export function useRoomAssignDialog() {
  return useScheduleStore(useShallow(roomDialogSelector))
}

/** Hook: Subscribe to list filter state */
export function useScheduleFilters() {
  return useScheduleStore(useShallow(filtersSelector))
}
