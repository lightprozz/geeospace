'use client'
// replaced by shared LMS providers PR

import { useState, useEffect, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { configureLmsTransport } from '@/features/lms/lib/transport'
import { apiFetch } from '@/lib/api-client'
import { API_URL } from '@/lib/env'
import { onAuthReset } from '@/stores/use-auth-store'
import { useExamDraftStore } from '@/features/lms/stores/use-exam-draft-store'
import { useReportDraftStore } from '@/features/lms/stores/use-report-draft-store'

configureLmsTransport({
  request: (path, options) => apiFetch(path, options),
  resolveUrl: path => path.startsWith('http') ? path : `${API_URL}${path}`,
})

export function TempLmsWiring({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient())
  useEffect(() => onAuthReset(() => {
    client.clear()
    useExamDraftStore.getState().clearAllDrafts()
    useReportDraftStore.getState().clearAllDrafts()
  }), [client])
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
