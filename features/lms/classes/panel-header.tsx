'use client'

import { type ReactNode } from 'react'

type HeaderConfig = { breadcrumbs: ReactNode; actions?: ReactNode }
export function useSetDashboardHeader(config: HeaderConfig, _key?: string) {
  void _key
  return config
}
