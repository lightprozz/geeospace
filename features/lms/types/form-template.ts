// ---------------------------------------------------------------------------
// types/form-template.ts — FormTemplate Builder types (FRM v2)
// Used by both Sub-1 (RequestForm) and Sub-4 (WorkLog, Collections)
//
// SINGLE SOURCE OF TRUTH for the form-builder contract (M10). The field
// primitives (FieldType enum, FieldConfig, FieldOption) live in
// types/request.ts because they mirror the runtime wire contract; they are
// re-exported here so builder code has one import site.
// ---------------------------------------------------------------------------

import { z } from 'zod'
import {
  FieldType as FieldTypeEnum,
  FieldConfigSchema,
  FieldOptionSchema,
  type FieldConfig,
  type FieldOption,
  type FieldTypeValue,
} from '@/features/lms/types/request'

// ---- Field types (mirrors types/request.ts FieldType) -----------------------

export { FieldTypeEnum as FieldType }
export type FieldType = FieldTypeValue

// ---- Field config ---------------------------------------------------------
// `FieldConfigSchema` is the permissive union actually parsed off the wire:
// unknown keys survive so one legacy field with an unexpected config cannot
// fail a whole template parse.

export { FieldConfigSchema, FieldOptionSchema }
export type { FieldConfig, FieldOption }

// ---- Field schema ---------------------------------------------------------

/**
 * A field as read back from the API.
 *
 * `clientId` is a browser-only identifier assigned when a field is created in
 * the builder. It never reaches the API — the builder strips it before saving
 * — but it gives React a stable key and the canvas a stable selection target
 * while a not-yet-persisted field is renamed or reordered.
 */
export const FieldSchema = z.object({
  id: z.string(),
  fieldName: z.string(),
  label: z.string(),
  description: z.string().nullish(),
  type: z.number().int(),
  inputKey: z.string(),
  required: z.boolean(),
  displayOrder: z.number(),
  hidden: z.boolean(),
  config: FieldConfigSchema,
  value: z.unknown().optional(),
  clientId: z.string().optional(),
})
export type Field = z.infer<typeof FieldSchema>

// ---- Collection schemas ---------------------------------------------------

export const CollectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  active: z.boolean(),
  templateCount: z.number(),
  createdDate: z.string(),
  lastModified: z.string().nullish(),
})
export type Collection = z.infer<typeof CollectionSchema>

export const CreateCollectionRequestSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullish(),
  active: z.boolean().default(true),
})
export type CreateCollectionRequest = z.infer<typeof CreateCollectionRequestSchema>

export const UpdateCollectionRequestSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullish(),
  active: z.boolean(),
})
export type UpdateCollectionRequest = z.infer<typeof UpdateCollectionRequestSchema>

// ---- Template settings schemas ---------------------------------------------
// These map onto columns/child tables that already exist on the FormTemplate
// aggregate (see the V1 model); the V2 contract now exposes them so the
// builder's settings rail can round-trip real values.

export const TemplateCampusSchema = z.object({
  id: z.string(),
  campusId: z.string(),
  campusName: z.string().nullish(),
})
export type TemplateCampus = z.infer<typeof TemplateCampusSchema>

export const TemplateGroupSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  groupName: z.string().nullish(),
})
export type TemplateGroup = z.infer<typeof TemplateGroupSchema>

export const TemplateWatcherSchema = z.object({
  id: z.string(),
  userId: z.string(),
  fullName: z.string().nullish(),
  userName: z.string().nullish(),
  email: z.string().nullish(),
})
export type TemplateWatcher = z.infer<typeof TemplateWatcherSchema>

export const UpsertCampusSchema = z.object({
  campusId: z.string(),
  campusName: z.string().nullish(),
})
export type UpsertCampus = z.infer<typeof UpsertCampusSchema>

export const UpsertGroupSchema = z.object({
  groupId: z.string(),
  groupName: z.string().nullish(),
})
export type UpsertGroup = z.infer<typeof UpsertGroupSchema>

export const UpsertWatcherSchema = z.object({
  userId: z.string(),
  fullName: z.string().nullish(),
  userName: z.string().nullish(),
  email: z.string().nullish(),
})
export type UpsertWatcher = z.infer<typeof UpsertWatcherSchema>

// ---- Template schemas -----------------------------------------------------

export const TemplateListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  collectionId: z.string().nullish(),
  collectionName: z.string().nullish(),
  /**
   * Names of the campuses the template is visible to. Display only — the ids
   * live on the detail DTO. Absent on older API payloads.
   */
  campusNames: z.array(z.string()).optional().default([]),
  templateType: z.string(),
  deactivate: z.boolean(),
  isPublished: z.boolean(),
  createdDate: z.string(),
  lastModified: z.string().nullish(),
  updatedAt: z.string(),
})
export type TemplateListItem = z.infer<typeof TemplateListItemSchema>

export const TemplateDetailSchema = TemplateListItemSchema.extend({
  fields: z.array(FieldSchema),
  /** Turnaround window in hours. Absent/null when the template has no expiry. */
  expirationCycle: z.number().nullish(),
  campus: z.array(TemplateCampusSchema).optional(),
  groups: z.array(TemplateGroupSchema).optional(),
  watchers: z.array(TemplateWatcherSchema).optional(),
})
export type TemplateDetail = z.infer<typeof TemplateDetailSchema>

// ---- Field write payloads --------------------------------------------------
// `config` stays a loose record on write payloads: the builder edits config
// per type before the value is narrowed, and the API validates the final shape.

export const NewFieldSchema = z.object({
  fieldName: z.string(),
  label: z.string(),
  description: z.string().nullish(),
  type: z.number().int(),
  inputKey: z.string(),
  required: z.boolean(),
  displayOrder: z.number(),
  hidden: z.boolean(),
  config: z.record(z.string(), z.unknown()),
  clientId: z.string().optional(),
})
export type NewField = z.infer<typeof NewFieldSchema>

export const UpsertFieldSchema = z.object({
  id: z.string().nullish(),
  fieldName: z.string(),
  label: z.string(),
  description: z.string().nullish(),
  type: z.number().int(),
  inputKey: z.string(),
  required: z.boolean(),
  displayOrder: z.number(),
  hidden: z.boolean(),
  config: z.record(z.string(), z.unknown()),
  clientId: z.string().optional(),
})
export type UpsertField = z.infer<typeof UpsertFieldSchema>

/**
 * Canonical create/update bodies for a template.
 *
 * `CreateTemplateSchema` / `UpdateTemplateSchema` are the request-body
 * contracts; the `*RequestSchema` aliases keep the older names used by the
 * WorkLog API client working.
 */
export const CreateTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullish(),
  collectionId: z.string().nullish(),
  templateType: z.string().default('RequestForm'),
  fields: z.array(NewFieldSchema).default([]),
  expirationCycle: z.number().nullish(),
  campus: z.array(UpsertCampusSchema).optional(),
  groups: z.array(UpsertGroupSchema).optional(),
  watchers: z.array(UpsertWatcherSchema).optional(),
})
export type CreateTemplate = z.infer<typeof CreateTemplateSchema>

export const UpdateTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullish(),
  collectionId: z.string().nullish(),
  fields: z.array(UpsertFieldSchema).default([]),
  expirationCycle: z.number().nullish(),
  campus: z.array(UpsertCampusSchema).optional(),
  groups: z.array(UpsertGroupSchema).optional(),
  watchers: z.array(UpsertWatcherSchema).optional(),
})
export type UpdateTemplate = z.infer<typeof UpdateTemplateSchema>

export const CreateTemplateRequestSchema = CreateTemplateSchema
export type CreateTemplateRequest = CreateTemplate

export const UpdateTemplateRequestSchema = UpdateTemplateSchema
export type UpdateTemplateRequest = UpdateTemplate

export const ReorderFieldsSchema = z.object({
  fieldIds: z.array(z.string()),
})
export type ReorderFields = z.infer<typeof ReorderFieldsSchema>

export const TokenSchema = z.object({
  updatedAt: z.string(),
})
export type Token = z.infer<typeof TokenSchema>

// ---- Response envelopes ----------------------------------------------------

export const PagedResultSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    page: z.number(),
    pageSize: z.number(),
    total: z.number().nullish(),
    hasNext: z.boolean(),
  })

export const TemplateListResponseSchema = z.object({
  result: PagedResultSchema(TemplateListItemSchema),
})
export type TemplateListResponse = z.infer<typeof TemplateListResponseSchema>

// Template types
export const TemplateType = {
  RequestForm: 'RequestForm',
  WorkLog: 'WorkLog',
} as const
export type TemplateType = (typeof TemplateType)[keyof typeof TemplateType]

// ---- Template lookup (picker sources) --------------------------------------

export interface LookupCampus {
  id: string
  name: string
  address: string | null
  active: boolean
}

export interface LookupGroup {
  id: string
  name: string
  description: string | null
}

export interface LookupUser {
  id: string
  fullName: string
  userName: string | null
  email: string | null
}

// Field type labels — single source of truth for the 16-type FieldType enum
export const FIELD_TYPE_LABELS: Record<number, string> = {
  [FieldTypeEnum.ShortText]: 'Short Text',
  [FieldTypeEnum.LongText]: 'Long Text',
  [FieldTypeEnum.Date]: 'Date',
  [FieldTypeEnum.Dropdown]: 'Dropdown',
  [FieldTypeEnum.CheckBox]: 'Checkbox',
  [FieldTypeEnum.MultipleCheckBox]: 'Multiple Checkbox',
  [FieldTypeEnum.Attachment]: 'Attachment',
  [FieldTypeEnum.Email]: 'Email',
  [FieldTypeEnum.Number]: 'Number',
  [FieldTypeEnum.PickUser]: 'Pick User',
  [FieldTypeEnum.PickStudent]: 'Pick Student',
  [FieldTypeEnum.PickClass]: 'Pick Class',
  [FieldTypeEnum.PhoneNumber]: 'Phone Number',
  [FieldTypeEnum.Facilities]: 'Facilities',
  [FieldTypeEnum.Rating]: 'Rating',
  [FieldTypeEnum.PickStudentWithClass]: 'Pick Student with Class',
}

export const ALL_FIELD_TYPES = Object.entries(FIELD_TYPE_LABELS).map(
  ([value, label]) => ({ value: Number(value), label }),
)
