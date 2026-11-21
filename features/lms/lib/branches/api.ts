// ---------------------------------------------------------------------------
// lib/branches/api.ts — V2 Branches & Rooms API
// Routes: api/v2/admin/branches/*, api/v2/admin/rooms/*
// Fully migrated to V2 — no V1 gap endpoints remaining.
// ---------------------------------------------------------------------------

import { api, queryPaged } from '@/features/lms/lib/transport'
import type {
  Campus,
  CampusFormInput,
  ClassRoom,
  ClassRoomFormInput,
  RoomType,
} from '@/features/lms/types/branch'

// ---- V2 route prefixes ------------------------------------------------------

const BRANCHES_API = '/api/v2/admin/Branches'
const ROOMS_API = '/api/v2/admin/Rooms'

// =========================================================================
// Branches (Campus) — V2
// =========================================================================

/** POST /api/v2/admin/Branches (query, campus auto-scoped via JWT) */
export async function fetchBranches(_userId?: string): Promise<Campus[]> {
  const result = await queryPaged<Campus>(`${BRANCHES_API}/query`, {
    pageSize: 500,
    sort: [{ field: 'name', desc: false }],
  })
  return result.items
}

/** GET /api/v2/admin/Branches/{id} */
export async function fetchBranchById(id: string): Promise<Campus> {
  return api.get<Campus>(`${BRANCHES_API}/${id}`)
}

/** POST /api/v2/admin/Branches/create */
export async function createBranch(data: CampusFormInput): Promise<Campus> {
  return api.post<Campus>(`${BRANCHES_API}/create`, data)
}

/** PUT /api/v2/admin/Branches/{id} */
export async function updateBranch(
  id: string,
  data: CampusFormInput,
): Promise<void> {
  await api.put(`${BRANCHES_API}/${id}`, data)
}

/** DELETE /api/v2/admin/Branches/{id} — FK-guarded on server */
export async function deleteBranch(id: string): Promise<void> {
  await api.delete(`${BRANCHES_API}/${id}`)
}

// =========================================================================
// Rooms (ClassRoom) — V2
// =========================================================================

/** POST /api/v2/admin/Rooms (query, campus-inherited scoping via JWT) */
export async function fetchClassrooms(_userId: string): Promise<ClassRoom[]> {
  const result = await queryPaged<ClassRoom>(`${ROOMS_API}/query`, {
    pageSize: 500,
    sort: [{ field: 'name', desc: false }],
  })
  return result.items
}

/** GET /api/v2/admin/Rooms/{id} */
export async function fetchClassroomById(id: string): Promise<ClassRoom> {
  return api.get<ClassRoom>(`${ROOMS_API}/${id}`)
}

/** POST /api/v2/admin/Rooms/create */
export async function createClassroom(
  data: ClassRoomFormInput,
): Promise<ClassRoom> {
  const payload = {
    ...data,
    roomTypeId: data.roomTypeId === '' ? null : data.roomTypeId,
  }
  return api.post<ClassRoom>(`${ROOMS_API}/create`, payload)
}

/** PUT /api/v2/admin/Rooms/{id} */
export async function updateClassroom(
  id: string,
  data: ClassRoomFormInput,
): Promise<void> {
  const payload = {
    ...data,
    roomTypeId: data.roomTypeId === '' ? null : data.roomTypeId,
  }
  await api.put(`${ROOMS_API}/${id}`, payload)
}

/** DELETE /api/v2/admin/Rooms/{id} — FK-guarded on server */
export async function deleteClassroom(id: string): Promise<void> {
  await api.delete(`${ROOMS_API}/${id}`)
}

// =========================================================================
// Room Types — V2 via Rooms controller
// =========================================================================

/** GET /api/v2/admin/Rooms/room-types */
export async function fetchRoomTypes(): Promise<RoomType[]> {
  return api.get<RoomType[]>(`${ROOMS_API}/room-types`)
}
