// ---------------------------------------------------------------------------
// sort-header.tsx
// Shared sortable column header component for data tables
// ---------------------------------------------------------------------------

import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'
import type { SortConfig } from '@/hooks/use-sort'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SortHeaderProps<TColumn extends string> {
  column: TColumn
  label: string
  currentSort: SortConfig<TColumn>
  onSort: (column: TColumn) => void
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SortHeader<TColumn extends string>({
  column,
  label,
  currentSort,
  onSort,
  className,
}: SortHeaderProps<TColumn>) {
  const isActive = currentSort.column === column

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onSort(column)}
      className={cn(
        'h-7 px-1 text-xs font-medium hover:bg-accent hover:text-foreground transition-colors',
        isActive ? 'text-foreground' : 'text-muted-foreground',
        className
      )}
    >
      {label}
      {isActive ? (
        currentSort.direction === 'asc' ? (
          <ArrowUp className="ml-1 h-3.5 w-3.5" />
        ) : (
          <ArrowDown className="ml-1 h-3.5 w-3.5" />
        )
      ) : (
        <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-50" />
      )}
    </Button>
  )
}

// ---------------------------------------------------------------------------
// Static column header (non-sortable)
// ---------------------------------------------------------------------------

export interface ColumnHeaderProps {
  label: string
  className?: string
}

export function ColumnHeader({ label, className }: ColumnHeaderProps) {
  return (
    <span className={cn('text-xs font-medium text-muted-foreground', className)}>
      {label}
    </span>
  )
}
