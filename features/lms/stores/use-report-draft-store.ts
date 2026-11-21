'use client'
// ---------------------------------------------------------------------------
// stores/use-report-draft-store.ts
// Zustand store for persisting unsaved attendance + assessment edit drafts
// Uses localStorage via Zustand `persist` middleware.
// Keyed by logId — each lesson log session has its own draft slot.
// Auto-cleanup: drafts are removed on successful save; stale drafts
// older than DRAFT_MAX_AGE_MS are purged on store hydration.
// ---------------------------------------------------------------------------

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Mirror of EditableStudent from class-reports-tab.tsx */
export interface DraftStudent {
  id: string
  present: number
  starScore: number
  note: string
  /** Per-criteria scores keyed by criteriaNumber (1, 2, 3) */
  criteria: Record<number, number>
}

interface DraftEntry {
  logId: string
  students: DraftStudent[]
  /** Timestamp (ms) when this draft was last updated */
  updatedAt: number
}

interface ReportDraftState {
  /** Map of logId → draft entry */
  drafts: Record<string, DraftEntry>

  // Actions
  saveDraft: (logId: string, students: DraftStudent[]) => void
  getDraft: (logId: string) => DraftEntry | undefined
  clearDraft: (logId: string) => void
  hasDraft: (logId: string) => boolean
  clearAllDrafts: () => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Drafts older than 24 hours are considered stale and auto-purged */
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000

/** localStorage key for this store */
const STORAGE_KEY = 'geeo-report-drafts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Remove stale drafts older than DRAFT_MAX_AGE_MS */
function purgeStale(
  drafts: Record<string, DraftEntry>,
): Record<string, DraftEntry> {
  const now = Date.now()
  const cleaned: Record<string, DraftEntry> = {}
  for (const [key, entry] of Object.entries(drafts)) {
    if (now - entry.updatedAt < DRAFT_MAX_AGE_MS) {
      cleaned[key] = entry
    }
  }
  return cleaned
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useReportDraftStore = create<ReportDraftState>()(
  persist(
    (set, get) => ({
      drafts: {},

      saveDraft: (logId, students) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [logId]: {
              logId,
              students,
              updatedAt: Date.now(),
            },
          },
        })),

      getDraft: (logId) => get().drafts[logId],

      clearDraft: (logId) =>
        set((state) => {
          const drafts = { ...state.drafts }
          delete drafts[logId]
          return { drafts }
        }),

      hasDraft: (logId) => !!get().drafts[logId],

      clearAllDrafts: () => set({ drafts: {} }),
    }),
    {
      name: STORAGE_KEY,
      // Purge stale drafts on hydration (store load from localStorage)
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.drafts = purgeStale(state.drafts)
        }
      },
    },
  ),
)
