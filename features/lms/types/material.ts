// ---------------------------------------------------------------------------
// types/material.ts
// Material domain types, Zod schemas, constants — matches legacy DB schema
// 22 boolean category flags + int MaterialFormat enum
// ---------------------------------------------------------------------------

import { z } from 'zod'

// ---------------------------------------------------------------------------
// MaterialFormat — maps to BE int enum (MaterialFormatEnum)
// ---------------------------------------------------------------------------

export const MATERIAL_FORMAT_MAP = {
  Unknown: 0,
  ImageFile: 1,
  VideoFile: 2,
  PdfFile: 3,
  VideoLink: 4,
  Html: 5,
} as const

export type MaterialFormatInt = 0 | 1 | 2 | 3 | 4 | 5

/** Format dropdown options for create/edit form (Vietnamese labels from legacy) */
export const MATERIAL_FORMAT_OPTIONS: {
  value: MaterialFormatInt
  label: string
}[] = [
  { value: 1, label: 'File hình ảnh' },
  { value: 2, label: 'File Video' },
  { value: 3, label: 'File PDF' },
  { value: 4, label: 'Link Video' },
  { value: 5, label: 'HTML' },
]

/** File accept string for upload input, keyed by format int */
export const FORMAT_FILE_ACCEPT: Partial<Record<MaterialFormatInt, string>> = {
  1: 'image/*',
  2: 'video/*',
  3: '.pdf',
  5: '.zip',
}

/** Formats that require file upload (not just a URL) */
export const FILE_UPLOAD_FORMATS: MaterialFormatInt[] = [1, 2, 3, 5]

/** Formats that use a URL field */
export const URL_FORMATS: MaterialFormatInt[] = [4]

// ---------------------------------------------------------------------------
// Category Flags — 22 booleans matching DB columns exactly
// ---------------------------------------------------------------------------

export interface MaterialCategoryFlags {
  math: boolean
  science: boolean
  music: boolean
  phonics: boolean
  sightwords: boolean
  english: boolean
  softSkills: boolean
  activityBook: boolean
  studentBook: boolean
  teacherPlanner: boolean
  m0: boolean
  m1: boolean
  m2: boolean
  m3: boolean
  a: boolean
  m: boolean
  e: boolean
  v: boolean
  c: boolean
  j: boolean
  s: boolean
  u: boolean
}

/** All 22 category flag keys */
export const CATEGORY_FLAG_KEYS: (keyof MaterialCategoryFlags)[] = [
  'math',
  'science',
  'music',
  'phonics',
  'sightwords',
  'english',
  'softSkills',
  'activityBook',
  'studentBook',
  'teacherPlanner',
  'm0',
  'm1',
  'm2',
  'm3',
  'a',
  'm',
  'e',
  'v',
  'c',
  'j',
  's',
  'u',
]

/** Default category flags — all false */
export const DEFAULT_CATEGORY_FLAGS: MaterialCategoryFlags = {
  math: false,
  science: false,
  music: false,
  phonics: false,
  sightwords: false,
  english: false,
  softSkills: false,
  activityBook: false,
  studentBook: false,
  teacherPlanner: false,
  m0: false,
  m1: false,
  m2: false,
  m3: false,
  a: false,
  m: false,
  e: false,
  v: false,
  c: false,
  j: false,
  s: false,
  u: false,
}

/** Category config for UI rendering — grouped by domain */
export type CategoryGroup = 'subject' | 'book' | 'level' | 'code'

export interface CategoryConfig {
  key: keyof MaterialCategoryFlags
  label: string
  group: CategoryGroup
}

export const MATERIAL_CATEGORIES: CategoryConfig[] = [
  // Subject categories
  { key: 'math', label: 'Math', group: 'subject' },
  { key: 'science', label: 'Science', group: 'subject' },
  { key: 'music', label: 'Music', group: 'subject' },
  { key: 'phonics', label: 'Phonics', group: 'subject' },
  { key: 'sightwords', label: 'Sightwords', group: 'subject' },
  { key: 'english', label: 'English', group: 'subject' },
  { key: 'softSkills', label: 'Soft Skills', group: 'subject' },
  // Book type
  { key: 'activityBook', label: 'Activity book', group: 'book' },
  { key: 'studentBook', label: "Student's book", group: 'book' },
  { key: 'teacherPlanner', label: 'Teacher planner', group: 'book' },
  // Level markers
  { key: 'm0', label: 'M0', group: 'level' },
  { key: 'm1', label: 'M1', group: 'level' },
  { key: 'm2', label: 'M2', group: 'level' },
  { key: 'm3', label: 'M3', group: 'level' },
  // Single-letter codes
  { key: 'a', label: 'A', group: 'code' },
  { key: 'm', label: 'M', group: 'code' },
  { key: 'e', label: 'E', group: 'code' },
  { key: 'v', label: 'V', group: 'code' },
  { key: 'c', label: 'C', group: 'code' },
  { key: 'j', label: 'J', group: 'code' },
  { key: 's', label: 'S', group: 'code' },
  { key: 'u', label: 'U', group: 'code' },
]

/** Group labels for section headers */
export const CATEGORY_GROUP_LABELS: Record<CategoryGroup, string> = {
  subject: 'Subject',
  book: 'Book Type',
  level: 'Level',
  code: 'Code',
}

// ---------------------------------------------------------------------------
// Material — full entity matching API response
// ---------------------------------------------------------------------------

export interface Material extends MaterialCategoryFlags {
  id: string
  name: string
  description: string | null
  materialFormat: MaterialFormatInt | null
  /** Computed by BE — display text for format (e.g. "File PDF") */
  materialFormatText: string
  /** Computed by BE — comma-separated active category names */
  materialCategories: string
  url: string | null
  openNewTab: boolean
  fileName: string | null
  /** Nullable FK → AspNetUsers. null = admin-created */
  teacherId: string | null
  /** null or true = approved; false = pending teacher submission */
  approved: boolean | null
  /** Navigation property — included in some GET responses */
  teacher?: {
    id: string
    firstName?: string
    lastName?: string
    fullName: string
    email?: string
  } | null
}

// ---------------------------------------------------------------------------
// V2 API response types
// ---------------------------------------------------------------------------

/** V2 list item — slim projection for query results */
export interface MaterialListItem {
  id: string
  name: string
  description: string | null
  materialFormat: MaterialFormatInt | null
  materialFormatText: string
  materialCategories: string
  fileName: string | null
  url: string | null
  approved: boolean | null
  teacherId: string | null
  teacherName: string | null
}

/** V2 detail — full projection with all 22 category flags */
export interface MaterialDetail extends MaterialListItem, MaterialCategoryFlags {
  openNewTab: boolean
}

/** V2 bulk delete response */
export interface BulkDeleteResult {
  deletedCount: number
  blocked: { id: string; reason: string }[]
}

// ---------------------------------------------------------------------------
// Payload — for POST/PUT (excludes computed fields)
// ---------------------------------------------------------------------------

export type MaterialPayload = Omit<
  Material,
  | 'id'
  | 'materialFormatText'
  | 'materialCategories'
  | 'teacher'
>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalize `approved` field — legacy uses nullable bit:
 * - null → treated as approved (admin-created)
 * - true → approved
 * - false → pending
 */
export function isApproved(material: Pick<Material, 'approved'>): boolean {
  return material.approved === null || material.approved === true
}

/**
 * Get display label for a MaterialFormat int value
 */
export function getFormatLabel(format: MaterialFormatInt | null): string {
  if (format === null || format === 0) return ''
  const opt = MATERIAL_FORMAT_OPTIONS.find((o) => o.value === format)
  return opt?.label ?? ''
}

/**
 * Get owner display name from Material
 */
export function getOwnerName(material: Pick<Material, 'teacher'>): string {
  return material.teacher?.fullName ?? 'Admin'
}

/**
 * Extract active category flags as comma-separated string (client-side)
 * Mirrors BE [NotMapped] MaterialCategories property
 */
export function buildCategoriesString(
  flags: MaterialCategoryFlags,
): string {
  return MATERIAL_CATEGORIES.filter((cat) => flags[cat.key])
    .map((cat) => cat.label)
    .join(', ')
}

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const categoryFlagsSchema = z.object({
  math: z.boolean(),
  science: z.boolean(),
  music: z.boolean(),
  phonics: z.boolean(),
  sightwords: z.boolean(),
  english: z.boolean(),
  softSkills: z.boolean(),
  activityBook: z.boolean(),
  studentBook: z.boolean(),
  teacherPlanner: z.boolean(),
  m0: z.boolean(),
  m1: z.boolean(),
  m2: z.boolean(),
  m3: z.boolean(),
  a: z.boolean(),
  m: z.boolean(),
  e: z.boolean(),
  v: z.boolean(),
  c: z.boolean(),
  j: z.boolean(),
  s: z.boolean(),
  u: z.boolean(),
})

export const UpsertMaterialSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional().default(''),
    materialFormat: z.coerce
      .number()
      .min(1, 'Format is required')
      .max(5) as z.ZodType<MaterialFormatInt>,
    url: z
      .string()
      .url('Enter a valid URL')
      .optional()
      .or(z.literal('')),
    openNewTab: z.boolean().default(false),
  })
  .merge(categoryFlagsSchema)

export type UpsertMaterialInput = z.infer<typeof UpsertMaterialSchema>
