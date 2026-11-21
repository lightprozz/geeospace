// ---------------------------------------------------------------------------
// requests-toolbar.tsx — Search, status filter, archived toggle
// ---------------------------------------------------------------------------

import { Search } from 'lucide-react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { REQUEST_FORM_STATUS_VALUES } from '@/features/lms/types/request'

import { useResetPage } from './requests-filters'

interface RequestsToolbarProps {
  search: string | null
  onSearchChange: (v: string | null) => void
  status: string | null
  onStatusChange: (v: string | null) => void
  archived: boolean
  onArchivedChange: (v: boolean) => void
}

const STATUS_LABELS: Record<number, string> = {
  100: 'Draft',
  1: 'New',
  2: 'Processing',
  3: 'Approved',
  4: 'Denied',
  5: 'Closed',
  6: 'Expired',
}

export function RequestsToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  archived,
  onArchivedChange,
}: RequestsToolbarProps) {
  const resetPage = useResetPage()
  const [inputValue, setInputValue] = useState(search ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync input when URL param changes externally (e.g. browser back/forward navigation).
  // Intentional URL-state sync — the lint rule disallows setState in effects but
  // we need it here to sync the controlled input with the URL parameter.
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInputValue(search ?? '')
  }, [search])

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setInputValue(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        onSearchChange(value || null)
        resetPage()
      }, 300)
    },
    [onSearchChange, resetPage],
  )

  const handleStatusChange = useCallback(
    (v: string) => {
      onStatusChange(v === 'all' ? null : v)
      resetPage()
    },
    [onStatusChange, resetPage],
  )

  const handleArchivedChange = useCallback(
    (v: boolean) => {
      onArchivedChange(v)
      resetPage()
    },
    [onArchivedChange, resetPage],
  )

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-3 border-b px-4 py-2">
      {/* Keyword search */}
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search requests..."
          value={inputValue}
          onChange={handleSearchChange}
          className="pl-8 h-8 text-xs"
        />
      </div>

      {/* Status filter */}
      <Select value={status ?? 'all'} onValueChange={handleStatusChange}>
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {REQUEST_FORM_STATUS_VALUES.map((s) => (
            <SelectItem key={s} value={String(s)}>
              {STATUS_LABELS[s] ?? `Status ${s}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Archived toggle */}
      <div className="flex items-center gap-1.5">
        <Switch
          id="archived-toggle"
          checked={archived}
          onCheckedChange={handleArchivedChange}
        />
        <Label htmlFor="archived-toggle" className="text-xs text-muted-foreground cursor-pointer">
          Include archived
        </Label>
      </div>
    </div>
  )
}
