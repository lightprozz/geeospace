'use client'
// ---------------------------------------------------------------------------
// _components/branch-list-panel.tsx
// Left pane displaying list of branches with card-like UI
// ---------------------------------------------------------------------------

import { Search, MapPin, Globe, LayoutList, Pencil, Trash2, MoreVertical } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePermission } from '@/components/auth/permission-guard'
import { PERMISSIONS } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import type { Campus } from '@/features/lms/types/branch'

interface BranchListPanelProps {
  branches: Campus[]
  isLoading: boolean
  searchQuery: string
  onSearchChange: (q: string) => void
  selectedBranchId: string | null
  onSelectBranch: (id: string) => void
  onEditBranch: (branch: Campus) => void
  onDeleteBranch: (branch: Campus) => void
  roomCountMap?: Map<string, number>
}

export function BranchListPanel({
  branches,
  isLoading,
  searchQuery,
  onSearchChange,
  selectedBranchId,
  onSelectBranch,
  onEditBranch,
  onDeleteBranch,
  roomCountMap,
}: BranchListPanelProps) {
  const { can } = usePermission()
  const canManageFacilities = can(PERMISSIONS.ADMIN_FACILITIES_MANAGE)

  return (
    <>
      {/* Header */}
      <div className="px-3 py-2.5 border-b space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Branches
          </span>
          <Badge variant="secondary" className="text-xs h-5">
            {isLoading ? '-' : branches.length}
          </Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Filter branches"
            placeholder="Filter branches..."
            className="pl-8 h-8 text-xs"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1.5">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border p-3 space-y-2"
            >
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))
        ) : branches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-center text-muted-foreground">
            <LayoutList className="h-6 w-6 opacity-30" />
            <p className="text-xs">{searchQuery ? 'No branches match filter' : 'No branches yet'}</p>
          </div>
        ) : (
          branches.map((branch) => {
            const matchesSelected = selectedBranchId === branch.id
            const roomCount = roomCountMap?.get(branch.id) ?? 0

            return (
              <div
                key={branch.id}
                onClick={() => onSelectBranch(branch.id)}
                className={cn(
                  'group relative flex flex-col gap-2 rounded-lg border p-3 cursor-pointer transition-all text-left',
                  'hover:border-primary/50 hover:shadow-sm',
                  matchesSelected
                    ? 'border-primary ring-1 ring-primary bg-primary/5'
                    : 'border-border bg-card'
                )}
              >
                {/* Header & DropdownMenu */}
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm leading-tight flex-1">
                    {branch.name ?? 'Unnamed'} {branch.address && <span className="font-normal text-muted-foreground">— {branch.address}</span>}
                  </p>
                  {canManageFacilities && (
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 -mr-1 -mt-1"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                          <span className="sr-only">Branch options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditBranch(branch)
                          }}
                        >
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Edit Branch
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteBranch(branch)
                          }}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete Branch
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Physical Address */}
                {(branch.fullAddress || branch.location) && (
                  <div className="flex items-start gap-1 text-xs text-muted-foreground mr-4">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                    <span className="line-clamp-2 leading-tight">
                      {branch.fullAddress || branch.location}
                    </span>
                  </div>
                )}

                {/* Meta Details */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  {roomCountMap && <span className="flex items-center gap-1">
                    <LayoutList className="h-3 w-3" />
                    {roomCount} {roomCount === 1 ? 'room' : 'rooms'}
                  </span>}
                  {branch.website && (
                    <span className="flex items-center gap-1 max-w-[130px] truncate">
                      <Globe className="h-3 w-3" />
                      {branch.website}
                    </span>
                  )}
                </div>

                <Separator className="my-0.5" />

                {/* Action bottom row */}
                <div className="flex items-center gap-1 -mb-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    aria-pressed={matchesSelected}
                    size="sm"
                    className="h-7 px-2 text-xs flex-1 justify-start gap-1.5 min-h-[1.75rem]"
                    onClick={() => onSelectBranch(branch.id)}
                  >
                    <LayoutList className="h-3.5 w-3.5" />
                    View Rooms
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
