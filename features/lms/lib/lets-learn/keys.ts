// ---------------------------------------------------------------------------
// lib/lets-learn/keys.ts
// Centralized TanStack Query key factory for Let's Learn module
// Prevents cache key drift across hooks
// ---------------------------------------------------------------------------

import type { LetsLearnSource } from '@/features/lms/types/lets-learn'

export const letsLearnKeys = {
  all: ['lets-learn'] as const,
  units: (id: string, source: LetsLearnSource) =>
    ['lets-learn', 'units', source, id] as const,
}
