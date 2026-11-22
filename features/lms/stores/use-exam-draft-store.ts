'use client'
// ---------------------------------------------------------------------------
// stores/use-exam-draft-store.ts
// Zustand store for persisting unsaved exam grading drafts (scores + comment)
// Uses localStorage via Zustand `persist` middleware.
// Keyed by composite key: "classId::studentId::examType"
// Pattern mirrors use-report-draft-store.ts — same lifecycle, different shape.
// Auto-cleanup: drafts older than DRAFT_MAX_AGE_MS purged on store hydration.
// ---------------------------------------------------------------------------

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { ExamFormJson } from '@/features/lms/types/exam-result'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DraftExamEntry {
  /** Composite key: "classId::studentId::examType" */
  key: string
  /** Full exam scores (overall + academic arrays) */
  scores: ExamFormJson
  /** Teacher comment — rich-text HTML string from TiptapEditor */
  comment: string
  /** Timestamp (ms) when this draft was last updated */
  updatedAt: number
}

interface ExamDraftState {
  /** Map of composite key → draft entry */
  drafts: Record<string, DraftExamEntry>

  // Actions
  saveDraft: (key: string, scores: ExamFormJson, comment: string) => void
  getDraft: (key: string) => DraftExamEntry | undefined
  clearDraft: (key: string) => void
  hasDraft: (key: string) => boolean
  clearAllDrafts: () => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Drafts older than 24 hours are considered stale and auto-purged */
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000

/** localStorage key for this store */
const STORAGE_KEY = 'geeo-exam-drafts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build composite key from class, student, and exam type */
export function buildExamDraftKey(
  classId: string,
  studentId: string,
  examType: string | number,
): string {
  return `${classId}::${studentId}::${examType}`
}

/** Remove stale drafts older than DRAFT_MAX_AGE_MS */
function purgeStale(
  drafts: Record<string, DraftExamEntry>,
): Record<string, DraftExamEntry> {
  const now = Date.now()
  const cleaned: Record<string, DraftExamEntry> = {}
  for (const [key, entry] of Object.entries(drafts)) {
    if (now - entry.updatedAt < DRAFT_MAX_AGE_MS) {
      cleaned[key] = entry
    }
  }
  return cleaned
}

function latestDrafts(
  fallback: Record<string, DraftExamEntry>,
): Record<string, DraftExamEntry> {
  try {
    const { name, storage } = useExamDraftStore.persist.getOptions()
    const persisted = name ? storage?.getItem(name) : undefined
    if (persisted && 'state' in persisted) {
      return purgeStale(persisted.state.drafts)
    }
  } catch {}
  return fallback
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useExamDraftStore = create<ExamDraftState>()(
  persist(
    (set, get) => ({
      drafts: {},

      saveDraft: (key, scores, comment) =>
        set((state) => ({
          drafts: {
            ...latestDrafts(state.drafts),
            [key]: {
              key,
              scores,
              comment,
              updatedAt: Date.now(),
            },
          },
        })),

      getDraft: (key) => get().drafts[key],

      clearDraft: (key) =>
        set((state) => {
          const drafts = { ...latestDrafts(state.drafts) }
          delete drafts[key]
          return { drafts }
        }),

      hasDraft: (key) => !!get().drafts[key],

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
