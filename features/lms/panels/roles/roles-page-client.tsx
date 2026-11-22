'use client'

// ---------------------------------------------------------------------------
// _components/roles-page-client.tsx
// Roles & Permissions — main page client orchestrator
// Composes: RoleSidebar + RoleDetailHeader + PermissionSearch + PermissionGroupGrid
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useRoleList,
  useRoleDetail,
  useAssignPermission,
  useRemovePermission,
} from '@/features/lms/hooks/roles/use-roles'
import { RoleSidebar } from './role-sidebar'
import { RoleDetailHeader } from './role-detail-header'
import { PermissionSearch } from './permission-search'
import { PermissionGroupGrid } from './permission-group-grid'
import { ManagementError } from '../management-error'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RolesPageClient() {
  const [requestedRoleId, setSelectedRoleId] = useState<string>()
  const [searchQuery, setSearchQuery] = useState('')
  const [group, setGroup] = useState('all')
  const [claimedOnly, setClaimedOnly] = useState(false)

  // ── Server data ─────────────────────────────────────────────────
  const { data: roleListResult, isLoading: isRoleListLoading, error: listError, refetch: refetchList } = useRoleList()
  const roles = roleListResult?.items ?? []
  const activeRole = roles.find((role) => role.id === requestedRoleId) ?? roles[0]
  const selectedRoleId = activeRole?.id ?? null

  const { data: roleDetail, isLoading: isDetailLoading, error: detailError, refetch: refetchDetail } =
    useRoleDetail(selectedRoleId)

  // ── Mutations ───────────────────────────────────────────────────
  const assignPermission = useAssignPermission()
  const removePermission = useRemovePermission()
  const isMutating =
    assignPermission.isPending || removePermission.isPending

  function handleToggle(claimValue: string, isGranted: boolean, claimId?: string) {
    if (!selectedRoleId || isMutating) return
    if (isGranted) {
      if (claimId) removePermission.mutate({ roleId: selectedRoleId, claimId })
    } else {
      assignPermission.mutate({
        roleId: selectedRoleId,
        request: { claimType: 'permission', claimValue },
      })
    }
  }

  // ── Find active role item for header stats ──────────────────────
  const permissionCount = roleDetail?.permissions.length ?? 0

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b px-4 py-3">
        <h1 className="text-base font-semibold">Roles &amp; Permissions</h1>
      </header>
      {listError ? (
        <ManagementError resource="roles" error={listError} onRetry={() => void refetchList()} />
      ) : (
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 @2xl/management:flex-row">
      {/* Left: Role list sidebar */}
      <RoleSidebar
        roles={roles}
        selectedRoleId={selectedRoleId}
        onSelectRole={setSelectedRoleId}
        isLoading={isRoleListLoading}
      />

      {/* Right: Permission panel */}
      <div className="@container/permissions flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {detailError && <ManagementError resource="role permissions" error={detailError} onRetry={() => void refetchDetail()} />}
        {/* Empty state when no role selected */}
        {!selectedRoleId && !isRoleListLoading && (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <ShieldCheck className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-1">
                No roles available
              </h3>
              <p className="text-sm text-muted-foreground">
                There are no system roles to manage.
              </p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isDetailLoading && selectedRoleId && (
          <div className="p-4 space-y-4">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          </div>
        )}

        {/* Active role content */}
        {activeRole && roleDetail && !detailError && !isDetailLoading && (
          <>
            {/* Search bar */}
            <PermissionSearch
              value={searchQuery}
              onChange={setSearchQuery}
              group={group}
              onGroupChange={setGroup}
              claimedOnly={claimedOnly}
              onClaimedOnlyChange={setClaimedOnly}
            />

            {/* Scrollable content area */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 space-y-6">
                {/* Role header banner */}
                <RoleDetailHeader
                  role={activeRole}
                  permissionCount={permissionCount}
                />

                {/* Permission grid */}
                <PermissionGroupGrid
                  grantedPermissions={roleDetail.permissions}
                  searchQuery={searchQuery}
                  group={group}
                  claimedOnly={claimedOnly}
                  onToggle={handleToggle}
                  isPending={isMutating}
                />
              </div>
            </ScrollArea>
          </>
        )}
      </div>
      </div>
      )}
    </div>
  )
}
