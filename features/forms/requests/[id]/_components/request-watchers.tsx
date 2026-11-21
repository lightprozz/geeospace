'use client'
// ---------------------------------------------------------------------------
// _components/request-watchers.tsx
// Avatar stack of watchers, deduplicated by userId.
// ---------------------------------------------------------------------------

import { cn } from "@/lib/utils"
import type { RequestWatcher } from "@/features/lms/types/request"

interface RequestWatchersProps {
  watchers: RequestWatcher[]
}

function deduplicateWatchers(watchers: RequestWatcher[]): RequestWatcher[] {
  const seen = new Set<string>()
  return watchers.filter((w) => {
    if (seen.has(w.userId)) return false
    seen.add(w.userId)
    return true
  })
}

export function RequestWatchers({ watchers }: RequestWatchersProps) {
  if (!watchers.length) return null

  const unique = deduplicateWatchers(watchers)
  const visible = unique.slice(0, 3)
  const overflow = unique.length - 3

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Watchers
      </span>
      <div className="flex items-center gap-1">
        {visible.map((watcher, i) => (
          <div
            key={watcher.userId}
            className={cn(
              "relative flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium ring-2 ring-card",
              i > 0 && "-ml-2"
            )}
            title={watcher.fullName}
          >
            {watcher.fullName.charAt(0).toUpperCase()}
          </div>
        ))}
        {overflow > 0 && (
          <div
            className="relative -ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium ring-2 ring-card"
            title={`${overflow} more watchers`}
          >
            +{overflow}
          </div>
        )}
      </div>
    </div>
  )
}
