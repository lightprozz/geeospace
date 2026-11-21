'use client'
// ---------------------------------------------------------------------------
// _components/role-campus-dialog.tsx
// Admin dialog for editing user Role + Campus assignment
// Uses PUT /api/v2/users/Users/{id}/role
// Campus checkboxes conditional on ROLES_HAVE_BRANCH
// ---------------------------------------------------------------------------

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { usePermission } from '@/components/auth/permission-guard'
import { PERMISSIONS } from '@/lib/permissions'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  fetchAccountInfo,
  fetchCampuses,
  fetchRoles,
  updateUserRole,
} from '@/features/lms/lib/users/api'
import { userKeys } from '@/features/lms/lib/users/query-keys'
import { roleRequiresBranch } from '@/features/lms/types/user'
import { ManagementError } from '../management-error'

const EMPTY_CAMPUSES: Awaited<ReturnType<typeof fetchCampuses>> = []

function parseCampusAssignment(assignment: string | null | undefined, campuses: typeof EMPTY_CAMPUSES) {
  if (!assignment) return new Set<string>()
  try {
    const ids: unknown = JSON.parse(assignment)
    if (Array.isArray(ids)) return new Set(ids.map(String))
  } catch { /* Older accounts store comma-separated campus names. */ }
  const names = assignment.split(',').map(name => name.trim())
  return new Set(campuses.filter(campus => names.includes(campus.name)).map(campus => campus.id))
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RoleCampusDialogProps {
  userId: string | null
  open: boolean
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RoleCampusDialog({
  userId,
  open,
  onClose,
}: RoleCampusDialogProps) {
  const [roleOverride, setRoleOverride] = useState<string>()
  const [campusOverride, setCampusOverride] = useState<Set<string>>()
  const [campusSearch, setCampusSearch] = useState('')

  const queryClient = useQueryClient()
  const { can } = usePermission()
  const canSaveRole = can(PERMISSIONS.ADMIN_ROLES_MANAGE)

  const userQuery = useQuery({
    queryKey: userKeys.detail(userId ?? ''),
    queryFn: () => fetchAccountInfo(userId!),
    enabled: !!userId,
  })

  const rolesQuery = useQuery({
    queryKey: userKeys.roles(),
    queryFn: fetchRoles,
  })

  const campusesQuery = useQuery({
    queryKey: userKeys.campuses(),
    queryFn: fetchCampuses,
  })
  const { data: userDetail } = userQuery
  const { data: roles = [] } = rolesQuery
  const { data: campuses = EMPTY_CAMPUSES } = campusesQuery
  const failedQuery = [userQuery, rolesQuery, campusesQuery].find(query => query.isError)
  const isLoading = userQuery.isLoading || rolesQuery.isLoading || campusesQuery.isLoading
  const selectedRole = roleOverride ?? roles.find(role => role.normalizedName === userDetail?.roleId?.toUpperCase())?.id ?? ''
  const initialCampusIds = parseCampusAssignment(userDetail?.assignedCampus, campuses)
  const selectedCampusIds = campusOverride ?? initialCampusIds

  // ── Filter campuses by search ──────────────────────────────────
  const filteredCampuses = useMemo(() => {
    if (!campusSearch.trim()) return campuses
    return campuses.filter((c) =>
      c.name?.toLowerCase().includes(campusSearch.toLowerCase()),
    )
  }, [campuses, campusSearch])

  // ── Selected campuses for chips display ─────────────────────────
  const selectedCampuses = useMemo(() => {
    return campuses.filter((c) => selectedCampusIds.has(c.id))
  }, [campuses, selectedCampusIds])

  // ── Mutation ─────────────────────────────────────────────────
  const { mutate: saveRole, isPending: isSaving } = useMutation({
    mutationFn: () => {
      if (!canSaveRole || !userId || !userDetail || !selectedRole || isLoading || failedQuery) {
        throw new Error('Role assignment is unavailable')
      }

      return updateUserRole(userId, {
        id: userId,
        roleId: selectedRole,
        assignedCampus: JSON.stringify(Array.from(selectedCampusIds)),
        email: userDetail.email ?? '',
        firstName: '',
        lastName: '',
        phoneNumber: userDetail.phoneNumber ?? '',
        employeeCode: '',
        titleName: '',
        isExpat: false,
      })
    },
    onSuccess: () => {
      toast.success('Role & campus updated')
      queryClient.invalidateQueries({ queryKey: userKeys.accountList() })
      queryClient.invalidateQueries({
        queryKey: userKeys.detail(userId!),
      })
      onClose()
    },
    onError: () => {
      toast.error('Failed to update role')
    },
  })

  // ── Campus toggle ──────────────────────────────────────────────
  function toggleCampus(campusId: string, checked: boolean) {
    setCampusOverride((prev) => {
      const next = new Set(prev ?? initialCampusIds)
      if (checked) {
        next.add(campusId)
      } else {
        next.delete(campusId)
      }
      return next
    })
  }

  const showCampus = roleRequiresBranch(roles.find(role => role.id === selectedRole)?.name)

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Role & Campus</DialogTitle>
          <DialogDescription>
            {userDetail
              ? `Update role and campus assignment for ${userDetail.fullName ?? 'this user'}.`
              : 'Update role and campus assignment.'}
          </DialogDescription>
        </DialogHeader>

        {failedQuery ? (
          <ManagementError resource="role assignment" error={failedQuery.error} onRetry={() => void failedQuery.refetch()} />
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Role select */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Role</Label>
              <Select
                value={selectedRole}
                onValueChange={setRoleOverride}
              >
                <SelectTrigger aria-label="Role" className="h-9 text-sm">
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campus checkboxes — conditional on role */}
            {showCampus && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Assigned Campus
                </Label>

                {/* Selected chips */}
                {selectedCampuses.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedCampuses.map((c) => (
                      <Badge
                        key={c.id}
                        variant="secondary"
                        className="text-xs pl-2 pr-1 py-0.5 flex items-center gap-1"
                      >
                        <span className="truncate max-w-[120px]">{c.name}</span>
                        <button
                          type="button"
                          onClick={() => toggleCampus(c.id, false)}
                          className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5 flex items-center justify-center"
                          aria-label={`Remove ${c.name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Search input */}
                <Input
                  placeholder="Search campus..."
                  value={campusSearch}
                  onChange={(e) => setCampusSearch(e.target.value)}
                  className="h-8 text-xs"
                />

                {/* Quick actions */}
                {filteredCampuses.length > 0 && (
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setCampusOverride(new Set([...selectedCampusIds, ...filteredCampuses.map((c) => c.id)]))
                      }}
                      className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                    >
                      Select all
                    </button>
                    <span className="text-muted-foreground">|</span>
                    <button
                      type="button"
                      onClick={() => setCampusOverride(new Set())}
                      className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                )}

                {/* Campus list */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-md border max-h-48 overflow-y-auto">
                  {filteredCampuses.map((campus) => (
                    <label
                      key={campus.id}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground"
                    >
                      <Checkbox
                        checked={selectedCampusIds.has(campus.id)}
                        onCheckedChange={(checked) =>
                          toggleCampus(campus.id, checked === true)
                        }
                      />
                      <span className="truncate">{campus.name}</span>
                    </label>
                  ))}
                  {filteredCampuses.length === 0 && (
                    <p className="text-xs text-muted-foreground col-span-2 text-center py-4">
                      {campuses.length === 0
                        ? 'No campus available.'
                        : 'No campus matches your search.'}
                    </p>
                  )}
                </div>

                {/* Selection count */}
                <p className="text-xs text-muted-foreground text-right">
                  {selectedCampusIds.size} of {campuses.length} selected
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          {canSaveRole && (
            <Button
              size="sm"
              onClick={() => saveRole()}
              disabled={isSaving || isLoading || !!failedQuery || !selectedRole}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
