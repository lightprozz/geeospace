'use client'
// ---------------------------------------------------------------------------
// stores/use-curriculum-store.ts
// Zustand store for Curriculum module dialog state
// CLIENT-ONLY — do NOT import in Server Components
// ---------------------------------------------------------------------------

import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import type { LevelListItem, LessonListItem, UnitListItem } from '@/features/lms/types/curriculum'

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface DialogState<T> {
  open: boolean
  mode: 'create' | 'edit'
  data?: T
}

interface CurriculumState {
  // Level dialog
  levelDialog: DialogState<LevelListItem>

  // Lesson dialog
  lessonDialog: DialogState<LessonListItem>

  // Unit dialog
  unitDialog: DialogState<UnitListItem>

  // Level dialog actions
  openCreateLevel: () => void
  openEditLevel: (level: LevelListItem) => void
  closeLevel: () => void

  // Lesson dialog actions
  openCreateLesson: () => void
  openEditLesson: (lesson: LessonListItem) => void
  closeLesson: () => void

  // Unit dialog actions
  openCreateUnit: () => void
  openEditUnit: (unit: UnitListItem) => void
  closeUnit: () => void
}

// ---------------------------------------------------------------------------
// Default dialog state
// ---------------------------------------------------------------------------

const defaultLevelDialog: DialogState<LevelListItem> = { open: false, mode: 'create' }
const defaultLessonDialog: DialogState<LessonListItem> = { open: false, mode: 'create' }
const defaultUnitDialog: DialogState<UnitListItem> = { open: false, mode: 'create' }

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useCurriculumStore = create<CurriculumState>()((set) => ({
  // Initial state
  levelDialog: defaultLevelDialog,
  lessonDialog: defaultLessonDialog,
  unitDialog: defaultUnitDialog,

  // Level actions
  openCreateLevel: () =>
    set({ levelDialog: { open: true, mode: 'create', data: undefined } }),

  openEditLevel: (level: LevelListItem) =>
    set({ levelDialog: { open: true, mode: 'edit', data: level } }),

  closeLevel: () =>
    set({ levelDialog: { ...defaultLevelDialog } }),

  // Lesson actions
  openCreateLesson: () =>
    set({ lessonDialog: { open: true, mode: 'create', data: undefined } }),

  openEditLesson: (lesson: LessonListItem) =>
    set({ lessonDialog: { open: true, mode: 'edit', data: lesson } }),

  closeLesson: () =>
    set({ lessonDialog: { ...defaultLessonDialog } }),

  // Unit actions
  openCreateUnit: () =>
    set({ unitDialog: { open: true, mode: 'create', data: undefined } }),

  openEditUnit: (unit: UnitListItem) =>
    set({ unitDialog: { open: true, mode: 'edit', data: unit } }),

  closeUnit: () =>
    set({ unitDialog: { ...defaultUnitDialog } }),
}))

// ---------------------------------------------------------------------------
// Typed selectors — plain selector functions (NOT hooks)
// Use inside components via: useCurriculumStore(useShallow(levelDialogSelector))
// OR use the pre-built hooks below
// ---------------------------------------------------------------------------

const levelDialogSelector = (s: CurriculumState) => ({
  levelDialog: s.levelDialog,
  openCreateLevel: s.openCreateLevel,
  openEditLevel: s.openEditLevel,
  closeLevel: s.closeLevel,
})

const lessonDialogSelector = (s: CurriculumState) => ({
  lessonDialog: s.lessonDialog,
  openCreateLesson: s.openCreateLesson,
  openEditLesson: s.openEditLesson,
  closeLesson: s.closeLesson,
})

const unitDialogSelector = (s: CurriculumState) => ({
  unitDialog: s.unitDialog,
  openCreateUnit: s.openCreateUnit,
  openEditUnit: s.openEditUnit,
  closeUnit: s.closeUnit,
})

// ---------------------------------------------------------------------------
// Custom hooks — useShallow called correctly INSIDE hook functions
// ---------------------------------------------------------------------------

/** Hook: Subscribe to level dialog state with shallow equality */
export function useLevelDialog() {
  return useCurriculumStore(useShallow(levelDialogSelector))
}

/** Hook: Subscribe to lesson dialog state with shallow equality */
export function useLessonDialog() {
  return useCurriculumStore(useShallow(lessonDialogSelector))
}

/** Hook: Subscribe to unit dialog state with shallow equality */
export function useUnitDialog() {
  return useCurriculumStore(useShallow(unitDialogSelector))
}
