'use client'
// ---------------------------------------------------------------------------
// hooks/use-template.ts
// TanStack Query read hook for a single template detail.
// ---------------------------------------------------------------------------

import { useQuery } from "@tanstack/react-query"
import { getTemplate } from "../lib/api"

export const templateKeys = {
  all: ["templates"] as const,
  list: (params: object) => [...templateKeys.all, "list", params] as const,
  detail: (id: string) => [...templateKeys.all, "detail", id] as const,
}

export function useTemplate(id: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: templateKeys.detail(id ?? ""),
    queryFn: () => getTemplate(id!),
    enabled: options?.enabled ?? (id != null),
  })
}
