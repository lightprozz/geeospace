'use client'
// ---------------------------------------------------------------------------
// holidays/_components/add-holiday-dialog.tsx
// Dialog with Calendar multi-date picker for adding holiday dates
// ---------------------------------------------------------------------------

import { useState, useCallback, useEffect } from 'react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { usePermission } from '@/components/auth/permission-guard'
import { PERMISSIONS } from '@/lib/permissions'

interface AddHolidayDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Called when open state changes */
  onOpenChange: (open: boolean) => void
  /** Called with selected date strings ("yyyy-MM-dd"[]) when user confirms */
  onConfirm: (dates: string[]) => void
  /** Dialog title — e.g. "Add General Holiday", "Add Day Off" */
  title: string
  /** Already-existing dates to disable in the calendar */
  existingDates?: string[]
}

export function AddHolidayDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  existingDates = [],
}: AddHolidayDialogProps) {
  const { can } = usePermission()
  const canEditSchedule = can(PERMISSIONS.CLASS_SCHEDULE)
  const [selectedDays, setSelectedDays] = useState<Date[]>([])

  // Reset selection when dialog opens/closes
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedDays([])
    }
  }, [open])

  // Convert existing date strings to Date objects for disabling
  const disabledDates = existingDates.map((d) => new Date(d + 'T00:00:00'))

  const handleConfirm = useCallback(() => {
    const dateStrings = selectedDays.map((d) => format(d, 'yyyy-MM-dd'))
    onConfirm(dateStrings)
    setSelectedDays([])
  }, [selectedDays, onConfirm])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Select one or more dates from the calendar below.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-2">
          <Calendar
            mode="multiple"
            selected={selectedDays}
            onSelect={(days) => setSelectedDays(days ?? [])}
            disabled={disabledDates}
          />
        </div>

        {selectedDays.length > 0 && (
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground">
              {selectedDays.length} date{selectedDays.length > 1 ? 's' : ''} selected
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground/70">
              {selectedDays
                .sort((a, b) => a.getTime() - b.getTime())
                .map((d) => format(d, 'MMM dd'))
                .join(', ')}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {canEditSchedule && (
            <Button
              onClick={handleConfirm}
              disabled={selectedDays.length === 0}
            >
              Add {selectedDays.length > 0 ? `(${selectedDays.length})` : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
