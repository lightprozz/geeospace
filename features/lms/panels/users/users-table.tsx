'use client'
// ---------------------------------------------------------------------------
// _components/users-table.tsx
// Users table — Shadcn table with hover actions (View Info, Edit Role)
// Includes: client-side pagination with sticky footer
// ---------------------------------------------------------------------------

import {
  Eye,
  UserCog,
  ToggleLeft,
  ToggleRight,
  MoreHorizontal,
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { usePermission } from '@/components/auth/permission-guard'
import { PERMISSIONS } from '@/lib/permissions'
import type { AccountListItem } from '@/features/lms/types/user'
import { getInitials, isUserActive } from '@/features/lms/types/user'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const

// ---------------------------------------------------------------------------
// Role badge color mapping
// ---------------------------------------------------------------------------

function getRoleBadgeClass(role: string | null): string {
  switch (role?.toUpperCase()) {
    case 'ADMIN':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    case 'BRANCH ADMIN':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
    case 'PLANNER':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    case 'TEACHER':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
    case 'ACAD MANAGER':
      return 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400'
    case 'SALE MANAGER':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
    case 'SALE EXECUTIVE':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface UsersTableProps {
  users: AccountListItem[]
  totalFiltered: number
  isLoading: boolean
  onViewInfo: (user: AccountListItem) => void
  onEditRole: (user: AccountListItem) => void
  onToggleStatus: (user: AccountListItem) => void
  page: number
  pageSize: number
  totalPages: number
  rangeStart: number
  rangeEnd: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  sortField?: string
  sortDesc?: boolean
  onSortChange?: (field: string) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UsersTable({
  users,
  totalFiltered,
  isLoading,
  onViewInfo,
  onEditRole,
  onToggleStatus,
  page,
  pageSize,
  totalPages,
  rangeStart,
  rangeEnd,
  onPageChange,
  onPageSizeChange,
  sortField,
  sortDesc,
  onSortChange,
}: UsersTableProps) {
  const { can } = usePermission()
  const canManageRole = can(PERMISSIONS.ADMIN_ROLES_MANAGE)
  const canManageStatus = can(PERMISSIONS.ADMIN_USERS_MANAGE)
  const hasRowActions = canManageRole || canManageStatus

  if (isLoading) {
    return <TableSkeleton />
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-50 inline-block" />
    return sortDesc ? <ArrowDown className="ml-2 h-3 w-3 inline-block" /> : <ArrowUp className="ml-2 h-3 w-3 inline-block" />
  }

  const renderSortableHead = (label: string, field: string, className: string) => (
    <TableHead
      className={className}
      aria-sort={sortField === field ? (sortDesc ? 'descending' : 'ascending') : undefined}
    >
      <button
        type="button"
        className="flex min-h-8 items-center rounded-sm text-left hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
        onClick={() => onSortChange?.(field)}
      >
        {label}
        <SortIcon field={field} />
      </button>
    </TableHead>
  )

  return (
    <div className="flex flex-col h-full">
      {/* ── Table body ── */}
      <div className="flex-1 overflow-auto">
        <Table className="table-fixed w-full">
          <TableHeader className="sticky top-0 bg-card z-10 transition-none">
            <TableRow className="hover:bg-transparent h-10">
              {renderSortableHead('Full Name', 'fullName', 'w-[20%]')}
              {renderSortableHead('English Name', 'englishName', 'w-[14%]')}
              {renderSortableHead('Email', 'email', 'w-[22%]')}
              {renderSortableHead('Role', 'roleId', 'w-[14%]')}
              {renderSortableHead('Branch', 'branch', 'w-[14%]')}
              <TableHead className="w-[10%]">Status</TableHead>
              <TableHead className="w-[6%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-sm">No users found</p>
                    <p className="text-xs mt-1">Try adjusting your filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const active = isUserActive(user)
                return (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer group hover:bg-muted/50 h-12"
                    onClick={() => onViewInfo(user)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(user.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <button
                          type="button"
                          className="truncate text-left text-sm font-medium hover:underline"
                          onClick={event => { event.stopPropagation(); onViewInfo(user) }}
                        >
                          {user.fullName || '—'}
                        </button>
                      </div>
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground truncate max-w-[160px]">
                      {user.englishName || '—'}
                    </TableCell>

                    {/* Email */}
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {user.email || '—'}
                    </TableCell>

                    {/* Role badge */}
                    <TableCell>
                      {user.roleId && (
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 h-5 font-medium ${getRoleBadgeClass(user.roleId)}`}
                        >
                          {user.roleId}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Branch */}
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[160px]">
                      {user.branch || '—'}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            active
                              ? 'bg-emerald-500'
                              : 'bg-zinc-300 dark:bg-zinc-600'
                          }`}
                        />
                        <span className="text-xs">
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </TableCell>

                    {/* Actions dropdown — hidden entirely when the user lacks both
                        admin.roles.manage and admin.users.manage; View Info is
                        already reachable via the row click, so an actions menu
                        with nothing to manage would be a dangling no-op button. */}
                    <TableCell>
                      {hasRowActions && (
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              aria-label={`Actions for ${user.fullName ?? user.email ?? 'user'}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                onViewInfo(user)
                              }}
                            >
                              <Eye className="mr-2 h-3.5 w-3.5" />
                              View Info
                            </DropdownMenuItem>
                            {canManageRole && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onEditRole(user)
                                }}
                              >
                                <UserCog className="mr-2 h-3.5 w-3.5" />
                                Edit Role
                              </DropdownMenuItem>
                            )}
                            {canManageStatus && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onToggleStatus(user)
                                  }}
                                >
                                  {active ? (
                                    <>
                                      <ToggleLeft className="mr-2 h-3.5 w-3.5" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <ToggleRight className="mr-2 h-3.5 w-3.5" />
                                      Activate
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Sticky Footer: summary + pagination ── */}
      <div className="shrink-0 border-t bg-card/80 px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        {/* Left: summary info */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-medium tabular-nums">
            {totalFiltered === 0
              ? 'No items'
              : `${rangeStart}–${rangeEnd} of ${totalFiltered} items`}
          </span>
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
              onValueChange={(v) => onPageSizeChange(Number(v))}
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
            Page {page} of {totalPages}
          </span>

          {/* Navigation buttons */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPageChange(1)}
              disabled={page <= 1}
              aria-label="First page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPageChange(totalPages)}
              disabled={page >= totalPages}
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

function TableSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10 transition-none">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[220px]"><Skeleton className="h-4 w-24" /></TableHead>
              <TableHead className="w-[160px]"><Skeleton className="h-4 w-28" /></TableHead>
              <TableHead><Skeleton className="h-4 w-32" /></TableHead>
              <TableHead className="w-[140px]"><Skeleton className="h-4 w-20" /></TableHead>
              <TableHead className="w-[160px]"><Skeleton className="h-4 w-24" /></TableHead>
              <TableHead className="w-[90px]"><Skeleton className="h-4 w-16" /></TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                <TableCell><Skeleton className="h-7 w-7 rounded-sm" /></TableCell>
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
