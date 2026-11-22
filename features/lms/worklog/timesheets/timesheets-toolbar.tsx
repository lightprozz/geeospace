'use client'
// ---------------------------------------------------------------------------
// _components/timesheets-toolbar.tsx
// Timesheets grid toolbar — period nav, search, effortType/class filters,
// group-by-teacher toggle, CSV export.
//
// Period navigation is a SMALL local re-implementation of month arithmetic
// (`shiftPeriodKey` below) rather than a shared import: `lib/worklog/
// payroll-cycle.ts` only exports `periodKeyFor`/`periodRange`/`dayColumns`/
// `dateKeyToDate` — its `addMonths` helper (which does exactly this) is
// module-private, and that file is owned by another concurrently-running
// phase-5 agent this round, so it can't be extended here. Flagged in the
// phase report as a follow-up (export `addMonths`/add a `shiftPeriodKey`
// helper to `payroll-cycle.ts` so both the /worklog and /worklog/timesheets
// period selectors can share one implementation).
// ---------------------------------------------------------------------------

import { ChevronLeft, ChevronRight, Download, Layers, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { periodRange, type PeriodKey } from '@/features/lms/lib/worklog/payroll-cycle'

const ALL = '__all__'

/** Shifts a "YYYY-MM" period key by `deltaMonths` — see module header. */
function shiftPeriodKey(periodKey: PeriodKey, deltaMonths: number): PeriodKey {
  const [yearStr, monthStr] = periodKey.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const zeroBased = month - 1 + deltaMonths
  const y = year + Math.floor(zeroBased / 12)
  const m = ((zeroBased % 12) + 12) % 12
  return `${String(y).padStart(4, '0')}-${String(m + 1).padStart(2, '0')}`
}

function formatDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-')
  const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`
}

export interface EffortTypeOption {
  value: string
  label: string
}

export interface ClassOption {
  id: string
  name: string
}

interface TimesheetsToolbarProps {
  periodKey: PeriodKey
  onPeriodChange: (periodKey: PeriodKey) => void
  search: string
  onSearchChange: (value: string) => void
  effortTypeFilter: string
  onEffortTypeFilterChange: (value: string) => void
  effortTypeOptions: EffortTypeOption[]
  classFilter: string
  onClassFilterChange: (value: string) => void
  classOptions: ClassOption[]
  groupByTeacher: boolean
  onGroupByTeacherChange: (value: boolean) => void
  onExportCsv: () => void
  exportDisabled?: boolean
  rowCount: number
  grandTotal: number
}

export function TimesheetsToolbar({
  periodKey,
  onPeriodChange,
  search,
  onSearchChange,
  effortTypeFilter,
  onEffortTypeFilterChange,
  effortTypeOptions,
  classFilter,
  onClassFilterChange,
  classOptions,
  groupByTeacher,
  onGroupByTeacherChange,
  onExportCsv,
  exportDisabled,
  rowCount,
  grandTotal,
}: TimesheetsToolbarProps) {
  const { from, to } = periodRange(periodKey)

  return (
    <div className="px-4 pt-3 pb-2 space-y-2 border-b shrink-0">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Period navigation */}
        <div className="flex items-center gap-1 rounded-md border border-input bg-input/20 h-8 px-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onPeriodChange(shiftPeriodKey(periodKey, -1))}
            aria-label="Previous period"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-medium tabular-nums px-1 whitespace-nowrap">
            {formatDateKey(from)} – {formatDateKey(to)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onPeriodChange(shiftPeriodKey(periodKey, 1))}
            aria-label="Next period"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search teacher or class"
            placeholder="Search teacher or class..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        {/* Effort type filter */}
        <Select
          value={effortTypeFilter || ALL}
          onValueChange={(v) => onEffortTypeFilterChange(v === ALL ? '' : v)}
        >
          <SelectTrigger aria-label="Effort type" className="w-[150px] h-8 text-xs">
            <SelectValue placeholder="All Effort Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Effort Types</SelectItem>
            {effortTypeOptions
              .filter((opt) => opt.value) // guard: skip empty/null/undefined values
              .map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {/* Class filter */}
        <Select value={classFilter || ALL} onValueChange={(v) => onClassFilterChange(v === ALL ? '' : v)}>
          <SelectTrigger aria-label="Class" className="w-[150px] h-8 text-xs">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Classes</SelectItem>
            {classOptions.map((c) =>
              c.id ? (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ) : null,
            )}
          </SelectContent>
        </Select>

        {/* Group by teacher toggle */}
        <label className="flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-input bg-input/20 text-xs cursor-pointer select-none">
          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Group by teacher</span>
          <Switch checked={groupByTeacher} onCheckedChange={onGroupByTeacherChange} size="sm" />
        </label>

        {/* Export */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground tabular-nums">
            {rowCount} row{rowCount === 1 ? '' : 's'} · total{' '}
            <span className="font-semibold text-foreground">{grandTotal}</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={onExportCsv}
            disabled={exportDisabled}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>
    </div>
  )
}
