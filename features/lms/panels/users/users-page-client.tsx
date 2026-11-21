'use client'
// ---------------------------------------------------------------------------
// _components/users-page-client.tsx
// Users Management — main page client with client-side table processing
// Pattern: useClientTable for search/sort/filter/pagination
// ---------------------------------------------------------------------------

import { useState, useMemo, useCallback } from 'react'
import { Search } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useCan } from '@/lib/use-can'
import { PERMISSIONS } from '@/lib/permissions'

import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useClientTable, type ClientSort } from '@/hooks/use-client-table'
import { fetchAllAccountList, updateUserStatus, fetchCampuses } from '@/features/lms/lib/users/api'
import { userKeys } from '@/features/lms/lib/users/query-keys'
import { parseAssignedCampuses, type AccountListItem } from '@/features/lms/types/user'
import { ManagementError } from '../management-error'
import { UsersTable } from './users-table'
import { RoleCampusDialog } from './role-campus-dialog'
import { UserInfoDialog } from './user-info-dialog'

// ---------------------------------------------------------------------------
// Record constraint for useClientTable
// ---------------------------------------------------------------------------
type UserRecord = AccountListItem & Record<string, unknown>
const defaultSort = { field: 'fullName', desc: false } as const

export function UsersPageClient() {
  // ── Filter state ─────────────────────────────────────────────────
  const [statusTab, setStatusTab] = useState<'active' | 'inactive'>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [branchFilter, setBranchFilter] = useState('all')

  // ── Pagination & Sort state (client-side) ──────────────────────
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(20)
  const [sort, setSort] = useState<ClientSort<UserRecord> | null>(null)

  // ── Dialog state ─────────────────────────────────────────────────
  const [viewUserId, setViewUserId] = useState<string | null>(null)
  const [editRoleUserId, setEditRoleUserId] = useState<string | null>(null)

  // Stable callbacks for dialog close handlers to prevent infinite loops
  // See: https://github.com/radix-ui/primitives/issues/1836
  const handleCloseViewDialog = useCallback(() => setViewUserId(null), [])
  const handleCloseRoleDialog = useCallback(() => setEditRoleUserId(null), [])

  const queryClient = useQueryClient()
  const canManageStatus = useCan(PERMISSIONS.ADMIN_USERS_MANAGE)
  const canManageRoles = useCan(PERMISSIONS.ADMIN_ROLES_MANAGE)

  const { data: allUsers = [], isLoading, error, refetch } = useQuery({
    queryKey: userKeys.accountList(),
    queryFn: ({ signal }) => fetchAllAccountList(signal),
  })

  const { data: campuses = [], error: campusesError, refetch: refetchCampuses } = useQuery({
    queryKey: userKeys.campuses(),
    queryFn: fetchCampuses,
  })

  // ── Client-side filtering + table processing ────────────────────
  const filterPredicate = useCallback(
    (user: UserRecord) => {
      // Status filter
      const isActive = user.status as boolean
      if (statusTab === 'active' && !isActive) return false
      if (statusTab === 'inactive' && isActive) return false

      // Role filter
      if (roleFilter !== 'all') {
        const userRole = (user.roleId as string | null)?.toUpperCase()
        if (userRole !== roleFilter.toUpperCase()) return false
      }

      // Branch filter
      if (branchFilter !== 'all') {
        const selectedBranch = branchFilter.toLowerCase()
        if (!parseAssignedCampuses(user.branch).some(branch => branch.toLowerCase() === selectedBranch)) return false
      }

      return true
    },
    [statusTab, roleFilter, branchFilter],
  )

  const table = useClientTable<UserRecord>({
    data: allUsers as UserRecord[],
    searchFields: ['fullName', 'englishName', 'email'],
    searchQuery,
    filterPredicate,
    sort,
    sortStorageKey: 'users-table-sort',
    onSortChange: setSort,
    defaultSort,
    page,
    pageSize,
  })

  // ── Status toggle mutation ───────────────────────────────────────
  const { mutate: toggleStatus, isPending: isToggling } = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateUserStatus(id, isActive),
    onSuccess: async (_data, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userKeys.accountList() }),
        queryClient.invalidateQueries({ queryKey: userKeys.detail(id) }),
      ])
      toast.success('User status updated')
    },
    onError: () => {
      toast.error('Failed to update user status')
    },
  })

  // ── Derived data ─────────────────────────────────────────────────
  const availableBranches = useMemo(() => {
    return [...new Set(campuses.map(c => c.name).filter(Boolean))].sort()
  }, [campuses])
  const availableRoles = useMemo(() => [...new Set(allUsers.flatMap(user => user.roleId ? [user.roleId] : []))].sort(), [allUsers])

  const handleSortChange = useCallback(
    (field: string) => {
      const f = field as keyof UserRecord
      setSort(current => {
        const active = current ?? defaultSort
        if (active.field !== f) return { field: f, desc: false }
        return active.desc ? null : { field: f, desc: true }
      })
      setPage(1)
    },
    [],
  )

  // ── Handlers ─────────────────────────────────────────────────────
  function handleViewInfo(user: AccountListItem) {
    setViewUserId(user.id)
  }

  function handleEditRole(user: AccountListItem) {
    setEditRoleUserId(user.id)
  }

  function handleToggleStatus(user: AccountListItem) {
    if (!canManageStatus || isToggling) return
    const newIsActive = !user.status
    toggleStatus({ id: user.id, isActive: newIsActive })
  }

  // ── Table props ─────────────────────────────────────────────────
  const tableProps = {
    users: table.items as AccountListItem[],
    totalFiltered: table.totalFiltered,
    isLoading,
    onViewInfo: handleViewInfo,
    onEditRole: handleEditRole,
    onToggleStatus: handleToggleStatus,
    page: table.page,
    pageSize: table.pageSize,
    totalPages: table.totalPages,
    rangeStart: table.rangeStart,
    rangeEnd: table.rangeEnd,
    onPageChange: setPage,
    onPageSizeChange: (size: number) => {
      setPageSize(size)
      setPage(1)
    },
    sortField: String((sort ?? defaultSort).field),
    sortDesc: (sort ?? defaultSort).desc,
    onSortChange: handleSortChange,
  }

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b px-4 py-3">
        <h1 className="text-base font-semibold">Users Management</h1>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Tabs
          value={statusTab}
          onValueChange={(v) => {
            setStatusTab(v as 'active' | 'inactive')
            setPage(1)
          }}
          className="flex flex-col h-full"
        >
          {/* Toolbar inline */}
          <div className="px-4 pt-3 pb-2 space-y-2 border-b shrink-0">
            <div className="flex items-center gap-3 flex-wrap">
              <TabsList className="h-8">
                <TabsTrigger value="active" className="text-xs h-7 px-3 gap-1.5">
                  Active
                </TabsTrigger>
                <TabsTrigger value="inactive" className="text-xs h-7 px-3 gap-1.5">
                  Inactive
                </TabsTrigger>
              </TabsList>

              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  aria-label="Search users"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setPage(1)
                  }}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1) }}>
                <SelectTrigger aria-label="Filter by role" className="w-[160px] h-8 text-xs">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {availableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={branchFilter} onValueChange={(v) => { setBranchFilter(v); setPage(1) }}>
                <SelectTrigger aria-label="Filter by branch" disabled={!!campusesError} className="w-[160px] h-8 text-xs">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {availableBranches.map((branch) => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {campusesError && <ManagementError resource="branch filters" error={campusesError} onRetry={() => void refetchCampuses()} />}

          <TabsContent
            value={statusTab}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            {error
              ? <ManagementError resource="users" error={error} onRetry={() => void refetch()} />
              : <UsersTable {...tableProps} />}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <UserInfoDialog
        campuses={campuses}
        userId={viewUserId}
        open={!!viewUserId}
        onClose={handleCloseViewDialog}
      />

      {canManageRoles && editRoleUserId && (
        <RoleCampusDialog
          userId={editRoleUserId}
          open={!!editRoleUserId}
          onClose={handleCloseRoleDialog}
        />
      )}
    </div>
  )
}
