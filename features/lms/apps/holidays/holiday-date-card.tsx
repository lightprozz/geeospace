'use client'
// ---------------------------------------------------------------------------
// holidays/_components/holiday-date-card.tsx
// Reusable date card with calendar badge, day info, and hover-delete
// ---------------------------------------------------------------------------

import { format, parseISO } from 'date-fns'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HolidayDateCardProps {
  /** Date string in "yyyy-MM-dd" format */
  date: string
  /** Color variant: default (primary), rose (days off), emerald (days on) */
  variant?: 'default' | 'rose' | 'emerald'
  /** Called when the trash icon is clicked */
  onRemove?: () => void
}

const variantStyles = {
  default: {
    badge: 'bg-primary/10 text-primary border-primary/20',
    card: 'hover:border-primary/30',
    trash: 'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
  },
  rose: {
    badge: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    card: 'border-rose-100 bg-rose-50/30 hover:border-rose-200',
    trash: 'text-rose-400 hover:text-rose-600 hover:bg-rose-100',
  },
  emerald: {
    badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    card: 'border-emerald-100 bg-emerald-50/30 hover:border-emerald-200',
    trash: 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100',
  },
}

export function HolidayDateCard({
  date,
  variant = 'default',
  onRemove,
}: HolidayDateCardProps) {
  const parsed = parseISO(date)
  const monthStr = format(parsed, 'MMM')
  const dayStr = format(parsed, 'dd')
  const dayOfWeek = format(parsed, 'EEEE')
  const fullDate = format(parsed, 'yyyy-MM-dd')

  const styles = variantStyles[variant]

  return (
    <div
      className={cn(
        'group flex items-center justify-between rounded-lg border p-3 transition-colors',
        variant === 'default' && 'border-border bg-background',
        variant !== 'default' && styles.card,
      )}
    >
      <div className="flex items-center gap-3">
        {/* Calendar badge */}
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border',
            styles.badge,
          )}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {monthStr}
          </span>
          <span className="text-lg font-black leading-none">{dayStr}</span>
        </div>
        {/* Date info */}
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">
            {fullDate}
          </div>
          <div className="text-xs text-muted-foreground">{dayOfWeek}</div>
        </div>
      </div>

      {/* Remove button (visible on hover) */}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            'rounded-md p-2 opacity-0 transition-colors group-hover:opacity-100',
            styles.trash,
          )}
          aria-label={`Remove ${fullDate}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
