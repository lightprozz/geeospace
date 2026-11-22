'use client'
// ---------------------------------------------------------------------------
// _components/room-table-panel.tsx
// Right pane displaying rooms for the selected branch
// ---------------------------------------------------------------------------

import { Building2, Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { usePermission } from '@/components/auth/permission-guard'
import { PERMISSIONS } from '@/lib/permissions'
import { ManagementError } from '../management-error'
import type { Campus, ClassRoom } from '@/features/lms/types/branch'

interface RoomTablePanelProps {
  selectedBranch: Campus | null
  rooms: ClassRoom[]
  isLoading: boolean
  error: unknown
  onRetry: () => void
  onAddRoom: () => void
  onEditRoom: (room: ClassRoom) => void
  onDeleteRoom: (room: ClassRoom) => void
  onBack: () => void
}

export function RoomTablePanel({
  selectedBranch,
  rooms,
  isLoading,
  error,
  onRetry,
  onAddRoom,
  onEditRoom,
  onDeleteRoom,
  onBack,
}: RoomTablePanelProps) {
  const { can } = usePermission()
  const canManageFacilities = can(PERMISSIONS.ADMIN_FACILITIES_MANAGE)

  // Empty State: No branch selected
  if (!selectedBranch) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center text-muted-foreground animate-in fade-in duration-300">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
          <Building2 className="h-8 w-8 text-muted-foreground/70" />
        </div>
        <h3 className="text-base font-medium text-foreground">No branch selected</h3>
        <p className="mt-1 text-sm max-w-sm">
          Select a branch from the left panel to manage its rooms,
          or create a new branch to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="@2xl/management:hidden -ml-2 h-7 w-7 text-muted-foreground shrink-0"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to branch list</span>
          </Button>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">
              {selectedBranch.address ?? selectedBranch.name ?? 'Unnamed Branch'}
            </span>
            <Separator orientation="vertical" className="h-4 hidden @2xl/management:block" />
            <span className="text-xs text-muted-foreground hidden @2xl/management:block">
              {isLoading || error ? '…' : `${rooms.length} room${rooms.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>

        {canManageFacilities && (
          <div className="flex items-center gap-1.5">
            <Button size="sm" className="h-7 text-xs" onClick={onAddRoom}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Room
            </Button>
          </div>
        )}
      </div>

      {/* Table Container */}
      {error ? <ManagementError resource="classrooms" error={error} onRetry={onRetry} /> : (
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[35%] py-2 text-xs">Room Name</TableHead>
              <TableHead className="w-[25%] py-2 text-xs">Room No.</TableHead>
              <TableHead className="w-[25%] py-2 text-xs">Type</TableHead>
              <TableHead className="w-[15%] py-2 text-xs text-right text-transparent">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading table
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="py-2.5"><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="py-2.5"><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="py-2.5"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="py-2.5 text-right"><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : rooms.length === 0 ? (
              // Empty rooms
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-sm">No rooms found for this location.</p>
                    {canManageFacilities && (
                      <Button variant="outline" size="sm" className="h-7 text-xs mt-2" onClick={onAddRoom}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add First Room
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              // Room Rows
              rooms.map((room) => (
                <TableRow key={room.id} className="group hover:bg-muted/30">
                  <TableCell className="py-2.5 font-medium text-sm text-foreground">
                    {room.name ?? '—'}
                  </TableCell>
                  <TableCell className="py-2.5 text-sm text-muted-foreground">
                    <span className="truncate block max-w-[150px]">
                      {room.roomNumber ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5 text-sm">
                    {room.roomType?.name ?? '—'}
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    {canManageFacilities && (
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={() => onEditRoom(room)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit room</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => onDeleteRoom(room)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Delete room</span>
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      )}
    </div>
  )
}
