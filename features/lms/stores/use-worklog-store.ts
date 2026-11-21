'use client'
// ---------------------------------------------------------------------------
// stores/use-worklog-store.ts
// Zustand store for the My Worklog page's UI state (NOT server data —
// worklogs/attendance/summary all come from TanStack Query via
// hooks/worklog/*, per rules/02-state-management.md rule 4).
// CLIENT-ONLY — do NOT import in Server Components
// Follows pattern from stores/use-schedule-store.ts
// ---------------------------------------------------------------------------

import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import {
  periodKeyFor,
  todayDateKeyInSaigon,
  type DateKey,
  type PeriodKey,
} from '@/features/lms/lib/worklog/payroll-cycle'

export type WorklogTab = 'calendar' | 'ledger'

function getDefaultState(): WorklogState {
  return {
    periodKey: periodKeyFor(todayDateKeyInSaigon()),
    activeTab: 'calendar',
    selectedDay: null,
  }
}

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface WorklogState {
  /** Currently browsed payroll period ("YYYY-MM", 26→25 cycle). */
  periodKey: PeriodKey
  activeTab: WorklogTab
  /** Expanded calendar-day detail; null = no day expanded. */
  selectedDay: DateKey | null
}

interface WorklogActions {
  /**
   * Changing the period always closes any expanded day detail — a day
   * selected from the PRIOR period is meaningless once the grid re-renders
   * for a new one (STRICT reset-on-context-switch, rules/02-state-management.md).
   */
  setPeriodKey: (periodKey: PeriodKey) => void
  setActiveTab: (tab: WorklogTab) => void
  selectDay: (day: DateKey) => void
  closeDay: () => void
  /**
   * Module cleanup (per rules/02-state-management.md) — re-anchors periodKey
   * to whatever "today" resolves to at the moment of reset, not a frozen
   * module-load-time value, so the next visit always lands on the current
   * period instead of a stale browsed one.
   */
  reset: () => void
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useWorklogStore = create<WorklogState & WorklogActions>()((set) => ({
  ...getDefaultState(),

  setPeriodKey: (periodKey) => set({ periodKey, selectedDay: null }),
  setActiveTab: (activeTab) => set({ activeTab }),
  selectDay: (day) => set({ selectedDay: day }),
  closeDay: () => set({ selectedDay: null }),

  reset: () => set(getDefaultState()),
}))

// ---------------------------------------------------------------------------
// Typed selectors — plain functions, NOT hooks
// ---------------------------------------------------------------------------

const periodSelector = (s: WorklogState & WorklogActions) => ({
  periodKey: s.periodKey,
  setPeriodKey: s.setPeriodKey,
})

const tabSelector = (s: WorklogState & WorklogActions) => ({
  activeTab: s.activeTab,
  setActiveTab: s.setActiveTab,
})

const selectedDaySelector = (s: WorklogState & WorklogActions) => ({
  selectedDay: s.selectedDay,
  selectDay: s.selectDay,
  closeDay: s.closeDay,
})

// ---------------------------------------------------------------------------
// Custom hooks — useShallow called correctly INSIDE hook functions
// ---------------------------------------------------------------------------

/** Hook: subscribe to the currently browsed payroll period */
export function useWorklogPeriod() {
  return useWorklogStore(useShallow(periodSelector))
}

/** Hook: subscribe to the active tab (Calendar / Ledger) */
export function useWorklogTab() {
  return useWorklogStore(useShallow(tabSelector))
}

/** Hook: subscribe to the expanded calendar-day detail */
export function useWorklogSelectedDay() {
  return useWorklogStore(useShallow(selectedDaySelector))
}
