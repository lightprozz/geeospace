'use client'
// ---------------------------------------------------------------------------
// stores/use-lets-learn-store.ts
// Zustand store for Let's Learn session state (step navigation + timer)
// CLIENT-ONLY — no persist (session-only state, resets on page reload)
// ---------------------------------------------------------------------------

import { create } from 'zustand'

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface LetsLearnState {
  /** Currently active unit index (0-based) */
  activeStep: number
  /** Whether the "Good bye" end screen is showing */
  isEndScreen: boolean
  /** Per-unit elapsed seconds (durations[i] = seconds spent on unit i) */
  durations: number[]
  /** Total session elapsed seconds (for timer display) */
  totalSeconds: number
  /** Number of units in the lesson */
  unitCount: number

  // Actions
  /** Initialize a new session with the given number of units */
  initSession: (unitCount: number) => void
  /** Advance to the next unit, or show end screen if on last unit */
  next: () => void
  /** Go back to previous unit, or dismiss end screen */
  back: () => void
  /** Increment timer — called by setInterval every 1s from the component */
  tick: () => void
  /** Jump to a specific step (only allowed for completed steps) */
  goToStep: (index: number) => void
  /** Reset all state to initial values */
  resetSession: () => void
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useLetsLearnStore = create<LetsLearnState>()((set, get) => ({
  // Initial state
  activeStep: 0,
  isEndScreen: false,
  durations: [],
  totalSeconds: 0,
  unitCount: 0,

  initSession: (unitCount: number) =>
    set({
      unitCount,
      activeStep: 0,
      isEndScreen: false,
      durations: Array(unitCount).fill(0) as number[],
      totalSeconds: 0,
    }),

  next: () => {
    const { activeStep, unitCount } = get()
    if (activeStep < unitCount - 1) {
      set({ activeStep: activeStep + 1 })
    } else {
      set({ isEndScreen: true })
    }
  },

  back: () => {
    const { isEndScreen, activeStep } = get()
    if (isEndScreen) {
      set({ isEndScreen: false })
    } else if (activeStep > 0) {
      set({ activeStep: activeStep - 1 })
    }
  },

  tick: () => {
    const { isEndScreen, activeStep, durations, totalSeconds } = get()
    if (isEndScreen) return
    const nextDurations = [...durations]
    nextDurations[activeStep] = (nextDurations[activeStep] ?? 0) + 1
    set({ durations: nextDurations, totalSeconds: totalSeconds + 1 })
  },

  goToStep: (index: number) => {
    const { activeStep, isEndScreen } = get()
    // Only allow navigating to completed steps or current step
    if (index <= activeStep || isEndScreen) {
      set({ activeStep: index, isEndScreen: false })
    }
  },

  resetSession: () =>
    set({
      activeStep: 0,
      isEndScreen: false,
      durations: [],
      totalSeconds: 0,
      unitCount: 0,
    }),
}))
