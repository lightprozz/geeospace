'use client'
// ---------------------------------------------------------------------------
// hooks/use-template-lookups.ts
// Picker sources for the builder settings rail. The endpoints cap at 200 rows
// server-side and accept a `keyword`, so the rail searches on the server with
// a debounced keyword instead of filtering a fixed list in the browser.
//
// Every hook accepts `enabled` so a read-only surface (the template detail
// view) can render the rail without querying the lookup endpoints at all.
// ---------------------------------------------------------------------------

import { useQuery } from "@tanstack/react-query"
import {
    getLookupCampuses,
  getLookupGroups,
  getLookupUsers,
} from "../lib/api"

export const lookupKeys = {
  campuses: (keyword: string) => ["lookups", "campuses", keyword] as const,
  groups: (keyword: string) => ["lookups", "groups", keyword] as const,
  users: (keyword: string) => ["lookups", "users", keyword] as const,
}

/** Normalised keyword used as the cache key so "Ada" and " ada " share a cache entry. */
export function lookupKeyword(keyword: string): string {
  return keyword.trim().toLowerCase()
}

export function useLookupCampuses(keyword = "", enabled = true) {
  const normalized = lookupKeyword(keyword)
  return useQuery({
    queryKey: lookupKeys.campuses(normalized),
    queryFn: () => getLookupCampuses(normalized || undefined),
    staleTime: 5 * 60 * 1000,
    enabled,
  })
}

export function useLookupGroups(keyword = "", enabled = true) {
  const normalized = lookupKeyword(keyword)
  return useQuery({
    queryKey: lookupKeys.groups(normalized),
    queryFn: () => getLookupGroups(normalized || undefined),
    staleTime: 5 * 60 * 1000,
    enabled,
  })
}

export function useLookupUsers(keyword = "", enabled = true) {
  const normalized = lookupKeyword(keyword)
  return useQuery({
    queryKey: lookupKeys.users(normalized),
    queryFn: () => getLookupUsers(normalized || undefined),
    staleTime: 5 * 60 * 1000,
    enabled,
  })
}
