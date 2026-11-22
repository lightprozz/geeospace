'use client'
// ---------------------------------------------------------------------------
// _components/select-room-dialog.tsx
// Searchable room picker — assign a room (ClassRoom) to a schedule
// Replaces legacy ScheduleTbClassRoomSelect.js
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { Search, DoorOpen, MapPin, Check, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useRoomAssignDialog } from '@/features/lms/stores/use-schedule-store'
import { useAssignRoom } from '@/features/lms/hooks/schedule/use-schedules'

// ---------------------------------------------------------------------------
// Room type (from ClassRoom API response)
// TODO: extract to types/class.ts when ClassRoom CRUD is implemented
// ---------------------------------------------------------------------------

interface RoomOption {
  id: string
  name: string
  campus: string
  capacity?: number
  type?: string
}

interface SelectRoomDialogProps {
  rooms: RoomOption[]
  isLoading?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SelectRoomDialog({ rooms, isLoading }: SelectRoomDialogProps) {
  const { roomDialog, closeRoomDialog } = useRoomAssignDialog()
  const { open, targetScheduleId, currentRoom } = roomDialog
  const [searchQuery, setSearchQuery] = useState('')

  // ── Filter ─────────────────────────────────────────────────────
  const filtered = searchQuery.trim()
    ? rooms.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.campus.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : rooms

  // ── Mutation ───────────────────────────────────────────────────
  const assignMutation = useAssignRoom()

  function handleSelect(room: RoomOption) {
    if (!targetScheduleId) return
    assignMutation.mutate(
      { scheduleId: targetScheduleId, roomId: room.id },
      {
        onSuccess: () => {
          closeRoomDialog()
          setSearchQuery('')
        },
      },
    )
  }

  function handleClose() {
    closeRoomDialog()
    setSearchQuery('')
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DoorOpen className="h-5 w-5 text-primary" />
            Select Room
          </DialogTitle>
          <DialogDescription>
            Assign a physical location for this schedule.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search rooms or campus..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto -mx-1 px-1 min-h-0 max-h-[40vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length > 0 ? (
            <div className="space-y-1">
              {filtered.map((room) => {
                const isCurrentRoom = currentRoom === room.name
                return (
                  <button
                    key={room.id}
                    onClick={() => handleSelect(room)}
                    disabled={assignMutation.isPending}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left group disabled:opacity-50',
                      isCurrentRoom
                        ? 'bg-primary/5 border-primary/30'
                        : 'bg-card border-transparent hover:bg-accent hover:border-border',
                    )}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'font-medium text-sm',
                            isCurrentRoom
                              ? 'text-primary'
                              : 'text-foreground',
                          )}
                        >
                          {room.name}
                        </span>
                        {room.type && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1 py-0 uppercase"
                          >
                            {room.type}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{room.campus}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {room.capacity && (
                        <span className="text-xs text-muted-foreground">
                          Cap: {room.capacity}
                        </span>
                      )}
                      {isCurrentRoom && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No rooms found matching your search.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
