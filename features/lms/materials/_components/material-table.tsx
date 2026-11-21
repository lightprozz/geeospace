'use client'
// ---------------------------------------------------------------------------
// _components/material-table.tsx
// Table of materials — format icons, status badges, skeleton loading
// Includes: client-side pagination with sticky footer
// ---------------------------------------------------------------------------

import {
  FileText,
  Video,
  Image,
  Link as LinkIcon,
  Code2,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { isApproved, type MaterialListItem, type MaterialFormatInt } from '@/features/lms/types/material'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const

// ---------------------------------------------------------------------------
// Format helpers — keyed by int values (1-5)
// ---------------------------------------------------------------------------

const FORMAT_CONFIG: Record<
  number,
  { icon: React.ElementType; color: string; label: string }
> = {
  1: { icon: Image, color: 'text-emerald-500', label: 'Image' },
  2: { icon: Video, color: 'text-blue-500', label: 'Video' },
  3: { icon: FileText, color: 'text-rose-500', label: 'PDF' },
  4: { icon: LinkIcon, color: 'text-sky-500', label: 'Link' },
  5: { icon: Code2, color: 'text-purple-500', label: 'HTML' },
}

const FALLBACK_FORMAT = {
  icon: HelpCircle,
  color: 'text-muted-foreground',
  label: '',
}

function FormatCell({ format }: { format: MaterialFormatInt | null }) {
  const cfg = format ? FORMAT_CONFIG[format] ?? FALLBACK_FORMAT : FALLBACK_FORMAT
  const Icon = cfg.icon
  return (
    <span className="flex items-center gap-1.5">
      <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
      <span className="text-xs">{cfg.label}</span>
    </span>
  )
}

function StatusBadge({ material }: { material: MaterialListItem }) {
  const approved = isApproved(material)
  return approved ? (
    <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
      Approved
    </Badge>
  ) : (
    <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
      Pending
    </Badge>
  )
}

function OwnerAvatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase()
  return (
    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
      {initial}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MaterialTableProps {
  materials: MaterialListItem[]
  apiTotalCount?: number
  isLoading: boolean
  selectedIds: Set<string>
  activeMaterialId?: string
  onSelect: (id: string, checked: boolean) => void
  /** Called with the IDs of the current page when toggling select-all */
  onSelectAll: (checked: boolean, pageIds: string[]) => void
  onRowClick: (material: MaterialListItem) => void
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  sortField?: string
  sortDesc?: boolean
  onSortChange?: (field: string) => void
}

export function MaterialTable({
  materials,
  apiTotalCount,
  isLoading,
  selectedIds,
  activeMaterialId,
  onSelect,
  onSelectAll,
  onRowClick,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  sortField,
  sortDesc,
  onSortChange,
}: MaterialTableProps) {
  const totalItems = apiTotalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  // The materials array is already paginated from the server
  const paginatedItems = materials

  // Selection state
  const allChecked =
    paginatedItems.length > 0 &&
    paginatedItems.every((m) => selectedIds.has(m.id))
  const someChecked =
    paginatedItems.some((m) => selectedIds.has(m.id)) && !allChecked

  // Range display: "1–20 of 143"
  const rangeStart = totalItems === 0 ? 0 : page * pageSize + 1
  const rangeEnd = Math.min((page + 1) * pageSize, totalItems)

  if (isLoading) return <TableSkeleton />

  const ownerName = (m: MaterialListItem) => m.teacherName ?? 'Admin'

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-50" />
    return sortDesc ? <ArrowDown className="ml-2 h-3 w-3" /> : <ArrowUp className="ml-2 h-3 w-3" />
  }

  const renderSortableHead = (label: string, field: string, className?: string) => (
    <TableHead
      className={`cursor-pointer hover:text-primary transition-colors select-none ${className || ''}`}
      onClick={() => onSortChange?.(field)}
    >
      <div className="flex items-center">
        {label}
        <SortIcon field={field} />
      </div>
    </TableHead>
  )

  return (
    <div className="flex flex-col h-full">
      {/* ── Table body ── */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 pr-0">
                <Checkbox
                  checked={allChecked}
                  data-indeterminate={someChecked}
                  onCheckedChange={() =>
                    onSelectAll(!allChecked, paginatedItems.map((m) => m.id))
                  }
                  aria-label="Select all on page"
                />
              </TableHead>
              {renderSortableHead('Name', 'name')}
              {renderSortableHead('Format', 'materialFormatText', 'w-24')}
              <TableHead className="w-40">Categories</TableHead>
              {renderSortableHead('Owner', 'teacherName', 'w-24')}
              {renderSortableHead('Status', 'approved', 'w-24')}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-10 text-sm text-muted-foreground"
                >
                  No materials found
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((m) => {
                const owner = ownerName(m)
                const isSelected = selectedIds.has(m.id)
                const isActive = activeMaterialId === m.id
                return (
                  <TableRow
                    key={m.id}
                    className={`cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-primary/10 hover:bg-primary/15'
                        : isSelected
                        ? 'bg-primary/5 hover:bg-primary/10'
                        : ''
                    }`}
                    onClick={() => onRowClick(m)}
                  >
                    <TableCell
                      className="w-10 pr-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedIds.has(m.id)}
                        onCheckedChange={(checked) =>
                          onSelect(m.id, !!checked)
                        }
                        aria-label={`Select ${m.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium truncate max-w-[240px]">
                          {m.name}
                        </p>
                        {m.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                            {m.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <FormatCell format={m.materialFormat} />
                    </TableCell>
                    <TableCell>
                      {m.materialCategories ? (
                        <span className="text-xs text-muted-foreground truncate block max-w-[140px]">
                          {m.materialCategories}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <OwnerAvatar name={owner} />
                        <span className="text-xs text-muted-foreground truncate max-w-[60px]">
                          {owner}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge material={m} />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Sticky Footer: summary + pagination ── */}
      <div className="shrink-0 border-t bg-card/80 backdrop-blur-sm px-4 py-2 flex items-center justify-between gap-4">
        {/* Left: summary info */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-medium tabular-nums">
            {totalItems === 0
              ? 'No items'
              : `${rangeStart}–${rangeEnd} of ${totalItems} items`}
          </span>
          {selectedIds.size > 0 && (
            <span className="text-primary font-medium">
              {selectedIds.size} selected
            </span>
          )}
        </div>

        {/* Right: page size + navigation */}
        <div className="flex items-center gap-3">
          {/* Page size selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Rows
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                onPageSizeChange(Number(v))
                onPageChange(0)
              }}
            >
              <SelectTrigger className="h-7 w-[60px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)} className="text-xs">
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Page info */}
          <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap min-w-[80px] text-center">
            Page {page + 1} of {totalPages}
          </span>

          {/* Navigation buttons */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPageChange(0)}
              disabled={page === 0}
              aria-label="First page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPageChange(totalPages - 1)}
              disabled={page >= totalPages - 1}
              aria-label="Last page"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Name</TableHead>
              <TableHead className="w-24">Format</TableHead>
              <TableHead className="w-40">Categories</TableHead>
              <TableHead className="w-24">Owner</TableHead>
              <TableHead className="w-24">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-4" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-6 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {/* Skeleton footer */}
      <div className="shrink-0 border-t px-4 py-2 flex justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-48" />
      </div>
    </div>
  )
}
