'use client'
// ---------------------------------------------------------------------------
// hooks/branches/use-room-types.ts
// TanStack Query hook for RoomType lookup
// CLIENT-ONLY
// ---------------------------------------------------------------------------

import { useQuery } from '@tanstack/react-query'
import { roomTypeKeys } from '@/features/lms/lib/branches/query-keys'
import { fetchRoomTypes } from '@/features/lms/lib/branches/api'

export function useRoomTypes(enabled = true) {
  return useQuery({
    queryKey: roomTypeKeys.all,
    queryFn: fetchRoomTypes,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes (rarely changes)
  })
}
