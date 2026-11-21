import { z } from 'zod'

// ---------------------------------------------------------------------------
// Campus (Branch) Types
// Matches GET /api/Campus/{id} and GET /api/Campus/GetCampusList/{userId}
// ---------------------------------------------------------------------------

export const CampusSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),        // Short name (e.g. "HHT")
  address: z.string().nullable(),      // Full name (e.g. "Hoàng Hoa Thám")
  fullAddress: z.string().nullable(),  // Physical address
  website: z.string().nullable(),      // Domain
  location: z.string().nullable(),     // Coordinates or descriptive location
  image: z.string().nullable(),        // Image URL or path
  ipAddress: z.string().nullable(),    // IP address
})

export type Campus = z.infer<typeof CampusSchema>

export const CampusFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Short name is required'),
  address: z.string().min(1, 'Full name is required'),
  fullAddress: z.string().min(1, 'Address is required'),
  website: z.string().optional(),
  location: z.string().optional(),
  image: z.string().optional(),
  ipAddress: z.string().optional(),
})

export type CampusFormInput = z.infer<typeof CampusFormSchema>

// ---------------------------------------------------------------------------
// ClassRoom Types
// Matches GET /api/ClassRooms/{id} and GET /api/ClassRooms/GetClassRoom/{userId}
// ---------------------------------------------------------------------------

export const ClassRoomSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  roomNumber: z.string().nullable(),
  campusId: z.string().nullable(),
  roomTypeId: z.string().nullable(),
  campus: CampusSchema.nullable().optional(),
  roomType: z.object({ id: z.string(), name: z.string() }).nullable().optional(),
})

export type ClassRoom = z.infer<typeof ClassRoomSchema>

export const ClassRoomFormSchema = z.object({
  name: z.string().min(1, 'Room name is required'),
  roomNumber: z.string().optional(),
  campusId: z.string().min(1, 'Branch is required'),
  roomTypeId: z.string().optional(),
})

export type ClassRoomFormInput = z.infer<typeof ClassRoomFormSchema>

// ---------------------------------------------------------------------------
// RoomType (Lookup) Types
// Matches GET /api/RoomTypes
// ---------------------------------------------------------------------------

export const RoomTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
})

export type RoomType = z.infer<typeof RoomTypeSchema>
