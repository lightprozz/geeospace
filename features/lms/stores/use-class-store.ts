'use client'
// ---------------------------------------------------------------------------
// stores/use-class-store.ts
// Zustand store for Classes module dialog state
// CLIENT-ONLY — do NOT import in Server Components
// Pattern: identical to stores/use-curriculum-store.ts
// ---------------------------------------------------------------------------

import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface ClassDialogState {
  open: boolean
  mode: 'create' | 'edit'
  /** Class ID for edit mode — dialog fetches full entity via useClassById */
  editId?: string
}

interface ClassState {
  // Class dialog
  classDialog: ClassDialogState

  // Class dialog actions
  openCreateClass: () => void
  openEditClass: (id: string) => void
  closeClass: () => void
}

// ---------------------------------------------------------------------------
// Default dialog state
// ---------------------------------------------------------------------------

const defaultClassDialog: ClassDialogState = {
  open: false,
  mode: 'create',
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useClassStore = create<ClassState>()((set) => ({
  // Initial state
  classDialog: defaultClassDialog,

  // Class dialog actions
  openCreateClass: () =>
    set({ classDialog: { open: true, mode: 'create', editId: undefined } }),

  openEditClass: (id: string) =>
    set({ classDialog: { open: true, mode: 'edit', editId: id } }),

  closeClass: () =>
    set({ classDialog: { ...defaultClassDialog } }),
}))

// ---------------------------------------------------------------------------
// Typed selectors — plain selector functions (NOT hooks)
// Use inside components via: useClassStore(useShallow(classDialogSelector))
// OR use the pre-built hook below
// ---------------------------------------------------------------------------

const classDialogSelector = (s: ClassState) => ({
  classDialog: s.classDialog,
  openCreateClass: s.openCreateClass,
  openEditClass: s.openEditClass,
  closeClass: s.closeClass,
})

// ---------------------------------------------------------------------------
// Custom hook — useShallow called correctly INSIDE hook function
// ---------------------------------------------------------------------------

/** Hook: Subscribe to class dialog state with shallow equality */
export function useClassDialog() {
  return useClassStore(useShallow(classDialogSelector))
}
