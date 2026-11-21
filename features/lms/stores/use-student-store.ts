// ---------------------------------------------------------------------------
// stores/use-student-store.ts
// Zustand store for Students Management UI state
// Manages: tab selection, filter values, pagination
// Pattern: same as stores/use-class-store.ts, stores/use-schedule-store.ts
// ---------------------------------------------------------------------------

import { create } from 'zustand'

// ---------------------------------------------------------------------------
// Store Types
// ---------------------------------------------------------------------------

interface StudentStoreState {
  // ── Tab ──────────────────────────────────────────────────────────────
  /** Maps to `suspended` param: 'active' → false, 'inactive' → true */
  activeTab: 'active' | 'inactive'
  setActiveTab: (tab: 'active' | 'inactive') => void

  // ── Filters ──────────────────────────────────────────────────────────
  /** Fuzzy search — name, phone, parent info */
  searchQuery: string
  setSearchQuery: (q: string) => void

  /** Campus ID — empty string = all */
  campusFilter: string
  setCampusFilter: (v: string) => void

  /** Level ID — empty string = all */
  levelFilter: string
  setLevelFilter: (v: string) => void

  /** Class ID — empty string = all */
  classFilter: string
  setClassFilter: (v: string) => void

  /** StudentType (ClassType enum value) — 0 = all */
  typeFilter: number
  setTypeFilter: (v: number) => void

  // ── Pagination ───────────────────────────────────────────────────────
  page: number
  pageSize: number
  setPage: (p: number) => void
  setPageSize: (s: number) => void

  // ── Reset ────────────────────────────────────────────────────────────
  /** Reset all filters to defaults. Preserves activeTab and pageSize. */
  resetFilters: () => void
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useStudentStore = create<StudentStoreState>((set) => ({
  // Tab
  activeTab: 'active',
  setActiveTab: (tab) => set({ activeTab: tab, page: 1 }),

  // Filters — every setter resets page to 1
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q, page: 1 }),

  campusFilter: '',
  setCampusFilter: (v) => set({ campusFilter: v, levelFilter: '', classFilter: '', page: 1 }),

  levelFilter: '',
  setLevelFilter: (v) => set({ levelFilter: v, classFilter: '', page: 1 }),

  classFilter: '',
  setClassFilter: (v) => set({ classFilter: v, page: 1 }),

  typeFilter: 0,
  setTypeFilter: (v) => set({ typeFilter: v, page: 1 }),

  // Pagination
  page: 1,
  pageSize: 20,
  setPage: (p) => set({ page: p }),
  setPageSize: (s) => set({ pageSize: s, page: 1 }),

  // Reset — preserves activeTab and pageSize (intentional)
  resetFilters: () =>
    set({
      searchQuery: '',
      campusFilter: '',
      levelFilter: '',
      classFilter: '',
      typeFilter: 0,
      page: 1,
    }),
}))
