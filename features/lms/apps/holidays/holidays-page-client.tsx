'use client'
// ---------------------------------------------------------------------------
// holidays/_components/holidays-page-client.tsx
// Main client shell for Holidays & Days Off feature
// Layout: split-pane (left: general holidays, right: class exceptions)
// ---------------------------------------------------------------------------

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Save, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePermission } from '@/components/auth/permission-guard'
import { PERMISSIONS } from '@/lib/permissions'
import { useAuthStore } from '@/stores/use-auth-store'
import {
  useHolidays,
  useClassListForHolidays,
  useSaveHolidays,
} from '@/features/lms/hooks/holidays/use-holidays'
import { buildSavePayload } from '@/features/lms/lib/holidays/utils'

import { GeneralHolidaysPanel } from './general-holidays-panel'
import { ClassExceptionsPanel } from './class-exceptions-panel'
import { AddHolidayDialog } from './add-holiday-dialog'

import type { HolidayData } from '@/features/lms/types/holiday'

type DialogTarget =
  | { type: 'general' }
  | { type: 'dayOff'; classId: string }
  | { type: 'dayOn'; classId: string }

export function HolidaysPageClient() {
  // ── Auth ───────────────────────────────────────────────────────
  const user = useAuthStore((s) => s.user)
  const userId = user?.sub ?? ''
  const { can } = usePermission()
  const canEditSchedule = can(PERMISSIONS.CLASS_SCHEDULE)

  // ── Data ───────────────────────────────────────────────────────
  const { data: holidayData, isLoading } = useHolidays(userId)
  const { data: classes = [] } = useClassListForHolidays(userId)
  const saveMutation = useSaveHolidays(userId)

  // ── Local edit state ───────────────────────────────────────────
  const [editedData, setEditedData] = useState<HolidayData | null>(null)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [dialogTarget, setDialogTarget] = useState<DialogTarget | null>(null)

  // Sync from query → local edit state on first load or after save
  useEffect(() => {
    if (holidayData && !editedData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditedData(holidayData)
    }
  }, [holidayData, editedData])

  // Re-sync after save success
  useEffect(() => {
    if (holidayData && saveMutation.isSuccess) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditedData(holidayData)
    }
  }, [holidayData, saveMutation.isSuccess])

  // ── Dirty check ────────────────────────────────────────────────
  const isDirty = useMemo(() => {
    if (!editedData || !holidayData) return false
    return JSON.stringify(editedData) !== JSON.stringify(holidayData)
  }, [editedData, holidayData])

  // ── Class exceptions data ──────────────────────────────────────
  const classDaysOff = useMemo(
    () => (selectedClassId ? editedData?.classHolidays[selectedClassId] ?? [] : []),
    [editedData, selectedClassId],
  )
  const classDaysOn = useMemo(
    () => (selectedClassId ? editedData?.classExcludeDays[selectedClassId] ?? [] : []),
    [editedData, selectedClassId],
  )

  // ── Handlers ───────────────────────────────────────────────────

  const handleRemoveGeneralHoliday = useCallback((date: string) => {
    setEditedData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        generalHolidays: prev.generalHolidays.filter((d) => d !== date),
      }
    })
  }, [])

  const handleRemoveDayOff = useCallback(
    (date: string) => {
      setEditedData((prev) => {
        if (!prev || !selectedClassId) return prev
        return {
          ...prev,
          classHolidays: {
            ...prev.classHolidays,
            [selectedClassId]: (prev.classHolidays[selectedClassId] ?? []).filter(
              (d) => d !== date,
            ),
          },
        }
      })
    },
    [selectedClassId],
  )

  const handleRemoveDayOn = useCallback(
    (date: string) => {
      setEditedData((prev) => {
        if (!prev || !selectedClassId) return prev
        return {
          ...prev,
          classExcludeDays: {
            ...prev.classExcludeDays,
            [selectedClassId]: (prev.classExcludeDays[selectedClassId] ?? []).filter(
              (d) => d !== date,
            ),
          },
        }
      })
    },
    [selectedClassId],
  )

  const handleAddDates = useCallback(
    (dates: string[]) => {
      if (!dialogTarget) return

      setEditedData((prev) => {
        if (!prev) return prev

        if (dialogTarget.type === 'general') {
          const merged = [...new Set([...prev.generalHolidays, ...dates])]
          return { ...prev, generalHolidays: merged.sort() }
        }

        if (dialogTarget.type === 'dayOff') {
          const existing = prev.classHolidays[dialogTarget.classId] ?? []
          const merged = [...new Set([...existing, ...dates])]
          return {
            ...prev,
            classHolidays: {
              ...prev.classHolidays,
              [dialogTarget.classId]: merged.sort(),
            },
          }
        }

        if (dialogTarget.type === 'dayOn') {
          const existing = prev.classExcludeDays[dialogTarget.classId] ?? []
          const merged = [...new Set([...existing, ...dates])]
          return {
            ...prev,
            classExcludeDays: {
              ...prev.classExcludeDays,
              [dialogTarget.classId]: merged.sort(),
            },
          }
        }

        return prev
      })

      setDialogTarget(null)
    },
    [dialogTarget],
  )

  const handleSave = useCallback(() => {
    if (!editedData) return
    const payload = buildSavePayload(editedData, userId)
    saveMutation.mutate(payload)
  }, [editedData, userId, saveMutation])

  // ── Existing dates for dialog (to disable already-added) ──────
  const dialogExistingDates = useMemo(() => {
    if (!dialogTarget || !editedData) return []
    if (dialogTarget.type === 'general') return editedData.generalHolidays
    if (dialogTarget.type === 'dayOff')
      return editedData.classHolidays[dialogTarget.classId] ?? []
    if (dialogTarget.type === 'dayOn')
      return editedData.classExcludeDays[dialogTarget.classId] ?? []
    return []
  }, [dialogTarget, editedData])

  const dialogTitle = useMemo(() => {
    if (!dialogTarget) return ''
    if (dialogTarget.type === 'general') return 'Add General Holiday'
    if (dialogTarget.type === 'dayOff') return 'Add Day Off'
    return 'Add Day On (Make-up)'
  }, [dialogTarget])

  // ── Inject header ──────────────────────────────────────────────
  const headerActions = canEditSchedule ? (
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!isDirty || saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1.5 h-4 w-4" />
          )}
          Save Changes
        </Button>
      ) : undefined


  // ── Loading state ──────────────────────────────────────────────
  if (isLoading || !editedData) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 p-4 animate-in fade-in duration-300">
        <div className="xl:col-span-3">
          <Skeleton className="h-96 rounded-xl" />
        </div>
        <div className="xl:col-span-1">
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <>
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-3"><h1 className="text-base font-semibold">Holidays & Days Off</h1>{headerActions}</header>
      <div className="flex-1 overflow-auto min-h-0">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 p-4">
          {/* Left column: General Holidays — 3/4 width */}
          <div className="xl:col-span-3">
            <GeneralHolidaysPanel
              holidays={editedData.generalHolidays}
              onRemoveDate={handleRemoveGeneralHoliday}
              onAddClick={() => setDialogTarget({ type: 'general' })}
            />
          </div>

          {/* Right column: Class Exceptions — 1/4 width */}
          <div className="xl:col-span-1">
            <ClassExceptionsPanel
              classes={classes}
              selectedClassId={selectedClassId}
              onClassChange={setSelectedClassId}
              daysOff={classDaysOff}
              daysOn={classDaysOn}
              onRemoveDayOff={handleRemoveDayOff}
              onRemoveDayOn={handleRemoveDayOn}
              onAddDayOff={() =>
                selectedClassId &&
                setDialogTarget({ type: 'dayOff', classId: selectedClassId })
              }
              onAddDayOn={() =>
                selectedClassId &&
                setDialogTarget({ type: 'dayOn', classId: selectedClassId })
              }
            />
          </div>
        </div>
      </div>

      {/* Add Holiday Dialog */}
      <AddHolidayDialog
        open={!!dialogTarget}
        onOpenChange={(open) => !open && setDialogTarget(null)}
        onConfirm={handleAddDates}
        title={dialogTitle}
        existingDates={dialogExistingDates}
      />
    </>
  )
}
