'use client'
// ---------------------------------------------------------------------------
// holidays/_components/class-exceptions-panel.tsx
// Right panel: class-specific schedule exceptions (Days Off + Days On)
// ---------------------------------------------------------------------------

import { useMemo, useState } from 'react'
import {
  AlertCircle,
  CalendarCheck,
  CalendarOff,
  Check,
  ChevronsUpDown,
  Plus,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { usePermission } from '@/components/auth/permission-guard'
import { PERMISSIONS } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { HolidayDateCard } from './holiday-date-card'

import type { ClassCourseGrid } from '@/features/lms/types/class'

interface ClassExceptionsPanelProps {
  /** Available classes for dropdown */
  classes: ClassCourseGrid[]
  /** Currently selected class ID */
  selectedClassId: string
  /** Called when user selects a class */
  onClassChange: (id: string) => void
  /** Class-specific days off dates */
  daysOff: string[]
  /** Class-specific days on (make-up) dates */
  daysOn: string[]
  /** Called when user removes a day off */
  onRemoveDayOff: (date: string) => void
  /** Called when user removes a day on */
  onRemoveDayOn: (date: string) => void
  /** Called when user wants to add days off */
  onAddDayOff: () => void
  /** Called when user wants to add days on */
  onAddDayOn: () => void
}

export function ClassExceptionsPanel({
  classes,
  selectedClassId,
  onClassChange,
  daysOff,
  daysOn,
  onRemoveDayOff,
  onRemoveDayOn,
  onAddDayOff,
  onAddDayOn,
}: ClassExceptionsPanelProps) {
  const { can } = usePermission()
  const canEditSchedule = can(PERMISSIONS.CLASS_SCHEDULE)
  const [comboboxOpen, setComboboxOpen] = useState(false)

  // Deduplicate classes by id — API may return duplicates across course grids
  const uniqueClasses = useMemo(() => {
    const map = new Map<string, ClassCourseGrid>()
    for (const c of classes) {
      if (!map.has(c.id)) map.set(c.id, c)
    }
    return [...map.values()]
  }, [classes])

  // Selected class label for the trigger button
  const selectedLabel = useMemo(() => {
    const found = uniqueClasses.find((c) => c.id === selectedClassId)
    return found ? `${found.name} (${found.levelName})` : null
  }, [uniqueClasses, selectedClassId])

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-xl border border-border bg-background">
      {/* Header + Class selector */}
      <div className="shrink-0 border-b border-border bg-muted/20 p-4">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground">
          <CalendarOff className="h-4 w-4 text-amber-600" />
          Class Exceptions
        </h3>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Select Class
          </label>
          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={comboboxOpen}
                className="w-full justify-between font-normal"
              >
                {selectedLabel ?? (
                  <span className="text-muted-foreground">-- Select a class --</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search class name..." />
                <CommandList>
                  <CommandEmpty>No class found.</CommandEmpty>
                  <CommandGroup>
                    {uniqueClasses.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={`${c.name} ${c.levelName}`}
                        onSelect={() => {
                          onClassChange(c.id)
                          setComboboxOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedClassId === c.id ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        {c.name} ({c.levelName})
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-muted/5">
        {!selectedClassId ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <AlertCircle className="mb-3 h-10 w-10 opacity-20" />
            <p className="text-sm">
              Select a class to manage specific days off and make-up days.
            </p>
          </div>
        ) : (
          <div className="space-y-6 p-5">
            {/* Days Off section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-rose-600">
                  <CalendarOff className="h-4 w-4" />
                  Days Off (Cancel)
                </h4>
                {canEditSchedule && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onAddDayOff}
                    className="h-7 border-rose-200 bg-rose-50 px-2 text-xs text-rose-600 hover:bg-rose-100"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {daysOff.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-3 text-center text-xs italic text-muted-foreground">
                    No days off scheduled.
                  </div>
                ) : (
                  daysOff.map((date) => (
                    <HolidayDateCard
                      key={date}
                      date={date}
                      variant="rose"
                      onRemove={canEditSchedule ? () => onRemoveDayOff(date) : undefined}
                    />
                  ))
                )}
              </div>
            </div>

            <Separator />

            {/* Days On section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                  <CalendarCheck className="h-4 w-4" />
                  Days On (Make-up)
                </h4>
                {canEditSchedule && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onAddDayOn}
                    className="h-7 border-emerald-200 bg-emerald-50 px-2 text-xs text-emerald-600 hover:bg-emerald-100"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {daysOn.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-3 text-center text-xs italic text-muted-foreground">
                    No make-up days scheduled.
                  </div>
                ) : (
                  daysOn.map((date) => (
                    <HolidayDateCard
                      key={date}
                      date={date}
                      variant="emerald"
                      onRemove={canEditSchedule ? () => onRemoveDayOn(date) : undefined}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
