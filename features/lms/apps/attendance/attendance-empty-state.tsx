'use client'
// ---------------------------------------------------------------------------
// app/(dashboard)/attendance/_components/attendance-empty-state.tsx
// Reusable empty state component for Attendance panels
// Pattern: same as schedule-empty-state.tsx
// ---------------------------------------------------------------------------

import { Calendar, Users } from 'lucide-react'

interface AttendanceEmptyStateProps {
  type: 'students' | 'events'
}

const config = {
  students: {
    icon: Users,
    title: 'No absent students',
    description: 'No absent students found in this period.',
  },
  events: {
    icon: Calendar,
    title: 'No events found',
    description: 'No events found for the selected period.',
  },
} as const

export function AttendanceEmptyState({ type }: AttendanceEmptyStateProps) {
  const { icon: Icon, title, description } = config[type]

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 rounded-full bg-muted p-3">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h4 className="text-sm font-medium text-foreground">{title}</h4>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  )
}
