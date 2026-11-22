'use client'
// ---------------------------------------------------------------------------
// _components/branches-page-client.tsx
// Main client shell for Branches & Classrooms feature
// Layout: split-pane (left: branch list, right: room table)
// ---------------------------------------------------------------------------

import { useState, useMemo, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { usePermission } from '@/components/auth/permission-guard'
import { PERMISSIONS } from '@/lib/permissions'
import { useAuthStore } from '@/stores/use-auth-store'
import { useBranchDialog, useBranchStore, useRoomDialog } from '@/features/lms/stores/use-branch-store'
import { useBranchList, useDeleteBranch } from '@/features/lms/hooks/branches/use-branches'
import { useClassroomList, useDeleteClassroom } from '@/features/lms/hooks/branches/use-classrooms'
import type { Campus, ClassRoom } from '@/features/lms/types/branch'
import { BranchListPanel } from './branch-list-panel'
import { BranchUpsertDialog } from './branch-upsert-dialog'
import { cn } from '@/lib/utils'
import { RoomTablePanel } from './room-table-panel'
import { RoomUpsertDialog } from './room-upsert-dialog'
import { ManagementError } from '../management-error'

export function BranchesPageClient() {
  // ── State ──────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [branchToDelete, setBranchToDelete] = useState<Campus | null>(null)
  const [roomToDelete, setRoomToDelete] = useState<ClassRoom | null>(null)
  const [selectedId, selectBranch] = useState<string | null>(null)

  // ── Auth ───────────────────────────────────────────────────────
  const user = useAuthStore((s) => s.user)
  const userId = user?.sub ?? ''
  const { can } = usePermission()
  const canManageFacilities = can(PERMISSIONS.ADMIN_FACILITIES_MANAGE)

  // ── Store ──────────────────────────────────────────────────────
  const { openCreateBranch, openEditBranch } = useBranchDialog()
  const { openCreateRoom, openEditRoom } = useRoomDialog()

  // ── Data ───────────────────────────────────────────────────────
  const branchQuery = useBranchList(userId)
  const roomQuery = useClassroomList(userId)
  const { data: branches = [], isLoading } = branchQuery
  const { data: rooms = [] } = roomQuery
  useEffect(() => () => useBranchStore.setState(useBranchStore.getInitialState()), [])

  // Room count per campus
  const roomCountMap = useMemo(() => {
    const map = new Map<string, number>()
    rooms.forEach((r) => {
      if (!r.campusId) return
      map.set(r.campusId, (map.get(r.campusId) || 0) + 1)
    })
    return map
  }, [rooms])

  // Computed selected string
  const selectedBranch = branches.find((b) => b.id === selectedId) ?? null
  const selectedBranchId = selectedBranch?.id ?? null

  const branchRooms = useMemo(
    () => rooms.filter((r) => r.campusId === selectedBranchId),
    [rooms, selectedBranchId],
  )

  // Left panel search
  const filteredBranches = useMemo(() => {
    if (!searchQuery.trim()) return branches
    const q = searchQuery.toLowerCase()
    return branches.filter(
      (b) =>
        b.name?.toLowerCase().includes(q) ||
        b.address?.toLowerCase().includes(q) ||
        b.fullAddress?.toLowerCase().includes(q),
    )
  }, [branches, searchQuery])

  // ── Mutations ──────────────────────────────────────────────────
  const deleteBranchMutation = useDeleteBranch()
  const deleteRoomMutation = useDeleteClassroom()

  function handleConfirmDeleteBranch() {
    if (!canManageFacilities || !branchToDelete) return
    deleteBranchMutation.mutate(branchToDelete.id, {
      onSuccess: () => { if (selectedBranchId === branchToDelete.id) selectBranch(null) },
      onSettled: () => setBranchToDelete(null),
    })
  }

  function handleConfirmDeleteRoom() {
    if (!canManageFacilities || !roomToDelete) return
    deleteRoomMutation.mutate(roomToDelete.id, {
      onSettled: () => setRoomToDelete(null),
    })
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <h1 className="text-base font-semibold">Branches &amp; Classrooms</h1>
        {canManageFacilities && (
          <Button size="sm" onClick={openCreateBranch}>
            <Plus className="size-4" /> Add Branch
          </Button>
        )}
      </header>
      {branchQuery.error ? (
        <ManagementError resource="branches" error={branchQuery.error} onRetry={() => void branchQuery.refetch()} />
      ) : (
      <div className="flex min-h-0 flex-1">
      {/* ── Left Pane (Branch List) ── */}
      <div
        className={cn(
          'flex min-w-0 flex-col border-r bg-muted/10 @2xl/management:w-72 @2xl/management:shrink-0',
          selectedBranchId ? 'hidden @2xl/management:flex' : 'w-full',
        )}
      >
        <BranchListPanel
          branches={filteredBranches}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedBranchId={selectedBranchId}
          onSelectBranch={selectBranch}
          onEditBranch={(b) => openEditBranch(b.id)}
          onDeleteBranch={setBranchToDelete}
          roomCountMap={roomQuery.isSuccess ? roomCountMap : undefined}
        />
      </div>

      {/* ── Right Pane (Room Table) ── */}
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col overflow-hidden bg-background',
          !selectedBranchId ? 'hidden @2xl/management:flex' : 'w-full',
        )}
      >
        <RoomTablePanel
          selectedBranch={selectedBranch}
          rooms={branchRooms}
          isLoading={roomQuery.isLoading}
          error={roomQuery.error}
          onRetry={() => void roomQuery.refetch()}
          onAddRoom={() => selectedBranch && openCreateRoom(selectedBranch.id)}
          onEditRoom={(room) => openEditRoom(room.id, room.campusId ?? '')}
          onDeleteRoom={setRoomToDelete}
          onBack={() => selectBranch(null)}
        />
      </div>
      </div>
      )}

      {/* ── Dialogs ────────────────────────────────────────────── */}
      {canManageFacilities && <>
      <BranchUpsertDialog />
      <RoomUpsertDialog />

      <AlertDialog
        open={!!branchToDelete}
        onOpenChange={(open) => !open && setBranchToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Branch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete branch{' '}
              <strong>{branchToDelete?.name}</strong>? This action cannot be
              undone and may fail if rooms are assigned to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteBranch}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteBranchMutation.isPending}
            >
              {deleteBranchMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!roomToDelete}
        onOpenChange={(open) => !open && setRoomToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Room</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete room{' '}
              <strong>{roomToDelete?.name}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteRoom}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteRoomMutation.isPending}
            >
              {deleteRoomMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>}
    </div>
  )
}
