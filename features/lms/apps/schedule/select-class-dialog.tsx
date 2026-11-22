'use client'
// ---------------------------------------------------------------------------
// _components/select-class-dialog.tsx
// Searchable class picker — assign a class (ClassCourse) to a schedule
// Replaces legacy ScheduleTbClassCourseSelect.js
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { Search, BookOpen, CheckCircle2, Loader2 } from 'lucide-react'
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
import { useClassAssignDialog } from '@/features/lms/stores/use-schedule-store'
import { useAuthStore } from '@/stores/use-auth-store'
import { useClassList } from '@/features/lms/hooks/classes/use-classes'
import { useAssignClass } from '@/features/lms/hooks/schedule/use-schedules'
import { toClassItem } from '@/features/lms/types/class'
import type { ClassItem } from '@/features/lms/types/class'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SelectClassDialog() {
  const { classDialog, closeClassDialog } = useClassAssignDialog()
  const { open, targetScheduleId } = classDialog
  const [searchQuery, setSearchQuery] = useState('')

  // ── Auth ───────────────────────────────────────────────────────
  const user = useAuthStore((s) => s.user)
  const userId = user?.sub ?? ''

  // ── Data: active classes only (containsEndClass = 0) ───────────
  const { data: rawClasses, isLoading } = useClassList(userId, 0)
  const classes = (rawClasses?.items ?? []).map(toClassItem)

  // ── Filter ─────────────────────────────────────────────────────
  const filtered = searchQuery.trim()
    ? classes.filter(
        (c) =>
          c.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.levelName.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : classes

  // ── Mutation ───────────────────────────────────────────────────
  const assignMutation = useAssignClass()

  function handleSelect(classItem: ClassItem) {
    if (!targetScheduleId) return
    assignMutation.mutate(
      { scheduleId: targetScheduleId, classId: classItem.id },
      {
        onSuccess: () => {
          closeClassDialog()
          setSearchQuery('')
        },
      },
    )
  }

  function handleClose() {
    closeClassDialog()
    setSearchQuery('')
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Select Class
          </DialogTitle>
          <DialogDescription>
            Assign an active class to this schedule slot.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by class name or level..."
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
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  disabled={assignMutation.isPending}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent hover:text-accent-foreground group transition-colors text-left border border-transparent hover:border-border disabled:opacity-50"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-sm text-foreground">
                      {item.className}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                        {item.levelName}
                      </Badge>
                      <span>•</span>
                      <span>{item.scheduleDays || 'No schedule'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {item.studentCount} students
                    </span>
                    <CheckCircle2 className="h-4 w-4 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No classes found matching your search.
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
