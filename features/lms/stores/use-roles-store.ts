'use client'
// ---------------------------------------------------------------------------
// stores/use-roles-store.ts
// Zustand store for Roles & Permissions page UI state
// CLIENT-ONLY — manages selection and search, NOT server data
// ---------------------------------------------------------------------------

import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface RolesState {
  selectedRoleId: string | null
  searchQuery: string

  setSelectedRoleId: (id: string) => void
  setSearchQuery: (query: string) => void
  reset: () => void
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useRolesStore = create<RolesState>()((set) => ({
  selectedRoleId: null,
  searchQuery: '',

  setSelectedRoleId: (id: string) => set({ selectedRoleId: id }),

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  reset: () => set({ selectedRoleId: null, searchQuery: '' }),
}))

// ---------------------------------------------------------------------------
// Selectors & Pre-built Hooks
// ---------------------------------------------------------------------------

const selectionSelector = (s: RolesState) => ({
  selectedRoleId: s.selectedRoleId,
  setSelectedRoleId: s.setSelectedRoleId,
})

export function useRoleSelection() {
  return useRolesStore(useShallow(selectionSelector))
}

const searchSelector = (s: RolesState) => ({
  searchQuery: s.searchQuery,
  setSearchQuery: s.setSearchQuery,
})

export function useRoleSearch() {
  return useRolesStore(useShallow(searchSelector))
}
