// ---------------------------------------------------------------------------
// lib/schedule/api.ts — V2 Schedule & Timetable API
// Routes: api/v2/class/schedules/*, api/v2/class/timetable/*
// Fully migrated to V2 — no V1 gap endpoints remaining.
// ---------------------------------------------------------------------------

import { api, queryPaged, type PagedResult } from '@/features/lms/lib/transport'
import type {
  Schedule,
  ScheduleCalendarEvent,
  ScheduleFormValues,
} from '@/features/lms/types/schedule'

// ---- V2 route prefixes ------------------------------------------------------

const SCHEDULE_API = '/api/v2/class/Schedules'
const TIMETABLE_API = '/api/v2/class/Timetable'

// =========================================================================
// Schedule CRUD — V2
// =========================================================================

/** POST /api/v2/class/Schedules/query (campus auto-scoped via JWT) */
export async function fetchScheduleList(
  _userId: string,
  containsEndClass: 0 | 1,
  params?: {
    page?: number
    pageSize?: number
    search?: string
    sort?: { field: string; desc: boolean }[]
  }
): Promise<PagedResult<Schedule>> {
  return queryPaged<Schedule>(`${SCHEDULE_API}/query`, {
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 20,
    search: params?.search,
    filters: containsEndClass
      ? undefined // include all (active + expired)
      : { filters: [{ field: 'status', operator: 'eq', value: 'active' }] },
    sort: params?.sort ?? [{ field: 'startDate', desc: true }],
  })
}

/**
 * Fetch ALL schedules for client-side table processing.
 * GET /api/v2/class/Schedules/all — no pagination, campus-scoped via JWT.
 */
export async function fetchAllSchedules(
  containsEndClass: 0 | 1,
): Promise<Schedule[]> {
  return api.get<Schedule[]>(
    `${SCHEDULE_API}/all?includeExpired=${containsEndClass === 1}`
  )
}

/** GET /api/v2/class/Schedules/{id} */
export async function fetchScheduleById(id: string): Promise<Schedule> {
  return api.get<Schedule>(`${SCHEDULE_API}/${id}`)
}

/** POST /api/v2/class/Schedules */
export async function createSchedule(data: ScheduleFormValues): Promise<void> {
  return api.post<void>(SCHEDULE_API, data)
}

/** PUT /api/v2/class/Schedules/{id} */
export async function updateSchedule(id: string, data: ScheduleFormValues): Promise<void> {
  return api.put<void>(`${SCHEDULE_API}/${id}`, data)
}

/** DELETE /api/v2/class/Schedules/{id} */
export async function deleteSchedule(id: string): Promise<void> {
  return api.delete<void>(`${SCHEDULE_API}/${id}`)
}

// =========================================================================
// Assignment Commands — V2 (was V1 GET-for-mutation anti-pattern)
// =========================================================================

/** PUT /api/v2/class/Schedules/{scheduleId}/class */
export async function assignClassToSchedule(
  scheduleId: string,
  classId: string,
): Promise<void> {
  await api.put(`${SCHEDULE_API}/${scheduleId}/class`, { classId })
}

/** PUT /api/v2/class/Schedules/{scheduleId}/room */
export async function assignRoomToSchedule(
  scheduleId: string,
  roomId: string,
): Promise<void> {
  await api.put(`${SCHEDULE_API}/${scheduleId}/room`, { roomId })
}

// =========================================================================
// Utility — V2
// =========================================================================

/** POST /api/v2/class/Schedules/calculate-end-date */
export async function buildEndDate(
  classId: string,
  scheduleData: ScheduleFormValues,
): Promise<string> {
  return api.post<string>(`${SCHEDULE_API}/calculate-end-date`, {
    classId,
    startDate: scheduleData.startDate,
    startTime: scheduleData.startTime,
    endTime: scheduleData.endTime,
    monday: scheduleData.monday,
    tuesday: scheduleData.tuesday,
    wednesday: scheduleData.wednesday,
    thursday: scheduleData.thursday,
    friday: scheduleData.friday,
    saturday: scheduleData.saturday,
    sunday: scheduleData.sunday,
  })
}

// =========================================================================
// Timetable / Calendar — V2 (unified, replaces 3 V1 endpoints)
// =========================================================================

/** GET /api/v2/class/Timetable/events?campusId=&classId=&teacherId=&month=&year= */
export async function fetchTimetableEvents(params: {
  campusId?: string
  classId?: string
  teacherId?: string
  month?: number
  year?: number
}): Promise<ScheduleCalendarEvent[]> {
  const qp = new URLSearchParams()
  if (params.campusId) qp.set('campusId', params.campusId)
  if (params.classId) qp.set('classId', params.classId)
  if (params.teacherId) qp.set('teacherId', params.teacherId)
  if (params.month) qp.set('month', params.month.toString())
  if (params.year) qp.set('year', params.year.toString())

  const qs = qp.toString() ? `?${qp.toString()}` : ''
  return api.get<ScheduleCalendarEvent[]>(`${TIMETABLE_API}/events${qs}`)
}

// Backward-compat wrappers for existing callers

export async function fetchAllCalendarData(): Promise<ScheduleCalendarEvent[]> {
  return fetchTimetableEvents({})
}

export async function fetchCalendarByUserId(
  userId: string,
): Promise<ScheduleCalendarEvent[]> {
  return fetchTimetableEvents({ teacherId: userId })
}

export async function fetchCalendarByClassId(
  classId: string,
): Promise<ScheduleCalendarEvent[]> {
  return fetchTimetableEvents({ classId })
}

// buildClassLessons is now handled server-side automatically on schedule create/update
export async function buildClassLessons(_classId: string): Promise<void> {
  // No-op: lesson building is now chained automatically on schedule CRUD
}

// Re-export campus list from classes module
export { fetchCampusList } from '@/features/lms/lib/classes/api'
