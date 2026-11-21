'use client'
// ---------------------------------------------------------------------------
// _components/api-activity-log.tsx
// Activity log entries for the API Preview page. Entries are read from the
// template's inbound API history — the requests submitted through its API link.
// ---------------------------------------------------------------------------

import { Clock, Webhook } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ActivityStatus = 'success' | 'failed' | 'pending'

export interface ApiActivityEntry {
  id: string
  status: ActivityStatus
  action: string
  actor: string
  timestamp: string // ISO 8601 string
}

interface ApiActivityLogProps {
  entries: ApiActivityEntry[]
  emptyMessage?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusDotClass(status: ActivityStatus): string {
  switch (status) {
    case 'success':
      return 'bg-emerald-500'
    case 'failed':
      return 'bg-destructive'
    case 'pending':
      return 'bg-amber-500'
  }
}

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return iso
  const diffMs = Date.now() - ts
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'vừa xong'
  if (mins < 60) return `${mins} phút trước`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  return `${days} ngày trước`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ApiActivityLog({
  entries,
  emptyMessage = 'Chưa có hoạt động nào. Các webhook đã kích hoạt sẽ xuất hiện tại đây.',
}: ApiActivityLogProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Webhook className="h-4 w-4" />
          Nhật ký hoạt động
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <Clock className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-xs text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          <ol className="space-y-3">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3">
                {/* Status dot */}
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-1.5 size-2 shrink-0 rounded-full',
                    statusDotClass(entry.status),
                  )}
                />
                {/* Content */}
                <div className="flex-1 space-y-0.5">
                  <p className="text-sm text-foreground">{entry.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.actor} · {formatRelative(entry.timestamp)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
