'use client'
// ---------------------------------------------------------------------------
// hooks/roles/use-roles.ts
// TanStack Query hooks for Roles & Permissions CRUD
// CLIENT-ONLY
// ---------------------------------------------------------------------------

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { roleKeys } from '@/features/lms/lib/roles/query-keys'
import {
  fetchRoleList,
  fetchRoleDetail,
  assignPermission,
  removePermission,
} from '@/features/lms/lib/roles/api'
import type { AssignPermissionRequest } from '@/features/lms/types/role'

// =========================================================================
// Queries
// =========================================================================

/** Fetch all roles with user/permission counts */
export function useRoleList() {
  return useQuery({
    queryKey: roleKeys.lists(),
    queryFn: fetchRoleList,
  })
}

/** Fetch role detail with its permission claims */
export function useRoleDetail(id: string | null) {
  return useQuery({
    queryKey: roleKeys.detail(id ?? ''),
    queryFn: () => fetchRoleDetail(id!),
    enabled: !!id,
  })
}

// =========================================================================
// Mutations
// =========================================================================

/** Assign a permission claim to a role */
export function useAssignPermission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      roleId,
      request,
    }: {
      roleId: string
      request: AssignPermissionRequest
    }) => assignPermission(roleId, request),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: roleKeys.detail(variables.roleId) }),
        qc.invalidateQueries({ queryKey: roleKeys.lists() }),
      ])
      toast.success('Permission granted')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to assign permission')
    },
  })
}

/** Remove a permission claim from a role */
export function useRemovePermission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      roleId,
      claimId,
    }: {
      roleId: string
      claimId: string
    }) => removePermission(roleId, claimId),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: roleKeys.detail(variables.roleId) }),
        qc.invalidateQueries({ queryKey: roleKeys.lists() }),
      ])
      toast.success('Permission revoked')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to remove permission')
    },
  })
}
