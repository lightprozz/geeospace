import { isSafePath } from '@/lib/desktop/navigation'
import { deriveShiftCode, SHIFTS, type CalendarSession, type ScheduleCalendarEvent } from '@/features/lms/types/schedule'

export function getTimetableClassId(path: string): string | undefined {
  const parts = path.split('/')
  return isSafePath(path) && parts.length === 2 && parts[0] === 'class' && parts[1] ? parts[1] : undefined
}

export function toCalendarSessions(events: ScheduleCalendarEvent[]): CalendarSession[] {
  const seen = new Set<string>()
  const mapped: CalendarSession[] = []
  for (const event of events) {
    const startDate = new Date(event.startTime)
    const endDate = new Date(event.endTime)
    if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) continue

    const startHH = startDate.getHours().toString().padStart(2, '0')
    const startMM = startDate.getMinutes().toString().padStart(2, '0')
    const endHH = endDate.getHours().toString().padStart(2, '0')
    const endMM = endDate.getMinutes().toString().padStart(2, '0')

    const startTimeStr = `${startHH}:${startMM}`
    const endTimeStr = `${endHH}:${endMM}`
    const shiftCode = deriveShiftCode(startDate, startTimeStr)

    // Composite key: backend id (ClassLesson.Id) is non-unique across
    // sessions when a ClassCourse has multiple Schedule rows fanning out
    // in the join. Add the ISO startTime to distinguish occurrences.
    const id = `${event.id}__${event.startTime}`
    if (seen.has(id)) continue
    seen.add(id)

    mapped.push({
      id,
      className: event.title,
      room: '',      // API doesn't include room in calendar view
      teacher: '',   // API doesn't include teacher in calendar view
      startTime: startTimeStr,
      endTime: endTimeStr,
      date: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()),
      shiftCode,
      isEvent: SHIFTS.find(s => s.code === shiftCode)?.isEvent || false,
      campusId: event.campusId,
    })
  }

  return mapped
}
