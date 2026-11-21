// ---------------------------------------------------------------------------
// types/request.ts
// Zod schemas + inferred types for the FRM v2 requests runtime.
//
// CANONICAL CONTRACT:
//   GeeOBEv2/docs/api-endpoints-frontendv2/v2-forms-runtime-contract.md
// COUNTERPART MAPPER (what the API actually returns — outranks the doc):
//   GeeOBEv2/GeeO.Services/Services/V2/Forms/FormFieldJsonMapper.cs
//   GeeOBEv2/GeeO.Data/Dto/V2/Forms/FormFieldDtos.cs
//
// Everything here mirrors the BE DTOs 1:1 (PascalCase C# -> camelCase JSON).
// Field VALUES are deliberately typed loosely at the wire boundary and are
// narrowed by lib/requests/field-value.ts, which owns the per-type shapes.
// ---------------------------------------------------------------------------

import { z } from "zod"

// ---------------------------------------------------------------------------
// FieldType — pinned by NUMERIC value from GeeO.Data/Constants/TypeInputEnum.cs
//
// ⚠️ Values 12..15 are CONTESTED between the BE enum and the old-FE enum that
// authored live templates, and are NOT resolved by data. The BE mapper
// resolves them by VALUE SHAPE at runtime (FormFieldJsonMapper
// .ResolveEffectiveType) and never hard-maps them; so does
// lib/requests/field-value.ts. Do not build a 12..15 lookup table anywhere.
// ---------------------------------------------------------------------------

export const FieldType = {
  ShortText: 0,
  LongText: 1,
  Date: 2,
  Dropdown: 3,
  CheckBox: 4,
  MultipleCheckBox: 5,
  Attachment: 6,
  Email: 7,
  Number: 8,
  PickUser: 9,
  PickStudent: 10,
  PickClass: 11,
  PhoneNumber: 12,
  Facilities: 13,
  Rating: 14,
  PickStudentWithClass: 15,
} as const

export type FieldTypeValue = (typeof FieldType)[keyof typeof FieldType]

/** The 16 known numeric field types. */
export const FieldTypeSchema = z.literal([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
])

export function isFieldType(value: number): value is FieldTypeValue {
  return Number.isInteger(value) && value >= 0 && value <= 15
}

// ---------------------------------------------------------------------------
// Per-type config
//
// `FieldDto.Config` is C# `object` holding one of the records below, so the
// wire shape is decided by the field's type. FieldConfigSchema is the merged,
// permissive form actually parsed off the wire (unknown keys preserved) —
// the strict per-type schemas are exported for renderers that want to narrow.
// ---------------------------------------------------------------------------

/**
 * One selectable option. The label key is `name` for BOTH Dropdown(3) and
 * MultipleCheckBox(5) — v1's server-side `["text"]` lookup throws on real
 * FE-authored options, so `text` never reaches v2.
 */
export const FieldOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
})

export type FieldOption = z.infer<typeof FieldOptionSchema>

/** ShortText(0), LongText(1), Email(7), PhoneNumber(12). */
export const TextFieldConfigSchema = z.object({
  maxLength: z.number().nullish(),
})

/** Date(2). `format` is the v1 InputMask; the authoring default is dd/MM/yyyy. */
export const DateFieldConfigSchema = z.object({
  format: z.string(),
})

/** Dropdown(3). */
export const DropdownFieldConfigSchema = z.object({
  options: z.array(FieldOptionSchema),
})

/** MultipleCheckBox(5). `multiple` <- InitialData.params.isMultipleSelected. */
export const MultipleCheckBoxFieldConfigSchema = z.object({
  options: z.array(FieldOptionSchema),
  multiple: z.boolean(),
})

/** Attachment(6). */
export const AttachmentFieldConfigSchema = z.object({
  maxFiles: z.number().nullish(),
})

/** Number(8). `format` is the v1 InputMask: `#,##` / `#K` / `#%`. */
export const NumberFieldConfigSchema = z.object({
  min: z.number().nullish(),
  max: z.number().nullish(),
  format: z.string().nullish(),
})

/** PickUser(9) (multiple), PickStudent(10), PickClass(11), PickStudentWithClass(15). */
export const PickerFieldConfigSchema = z.object({
  multiple: z.boolean(),
})

/** Rating(14), from InitialData.params. */
export const RatingFieldConfigSchema = z.object({
  max: z.number(),
  precision: z.number(),
  iconType: z.string().nullish(),
})

/** CheckBox(4) and Facilities(13) carry no config. */
export const EmptyFieldConfigSchema = z.object({})

/**
 * The permissive union actually parsed off the wire: every per-type key is
 * optional and unknown keys survive, so one legacy field with an unexpected
 * config cannot fail the whole detail parse.
 */
export const FieldConfigSchema = z.strictObject({
  maxLength: z.number().nullish(),
  format: z.string().nullish(),
  options: z.array(FieldOptionSchema).optional(),
  multiple: z.boolean().optional(),
  maxFiles: z.number().nullish(),
  min: z.number().nullish(),
  max: z.number().nullish(),
  precision: z.number().nullish(),
  iconType: z.string().nullish(),
  allowNegative: z.boolean().optional(),
}).passthrough()

export type FieldConfig = z.infer<typeof FieldConfigSchema>

// ---------------------------------------------------------------------------
// Per-type field VALUE shapes (FormFieldJsonMapper.DecodeValue)
//
//   0,1,7,12  string
//   2         ISO-8601 string
//   3         string (option id)
//   4         boolean
//   5         string[] (option ids)
//   6         [{ url, fileName }]
//   8,14      number
//   9         [{ id, fullName }]            <- the ONLY array picker
//   10,11     { id, fullName }
//   13        { campus: {...}, room: {...} }
//   15        { id, fullName, classId, className }
//
// Every leaf is nullable: the mapper builds these records with `?.ToString()`,
// so a stored object missing a key yields null rather than being dropped.
// ---------------------------------------------------------------------------

/** Attachment(6) element. Stored key is `fileName` (the Answers projection renames it to `name`). */
export const AttachmentValueSchema = z.object({
  url: z.string().nullish(),
  fileName: z.string().nullish(),
})

export type AttachmentValue = z.infer<typeof AttachmentValueSchema>

/** PickUser(9) element, and the whole value of PickStudent(10) / PickClass(11). */
export const PersonRefSchema = z.object({
  id: z.string().nullish(),
  fullName: z.string().nullish(),
})

export type PersonRef = z.infer<typeof PersonRefSchema>

/** PickStudentWithClass(15). */
export const StudentWithClassRefSchema = z.object({
  id: z.string().nullish(),
  fullName: z.string().nullish(),
  classId: z.string().nullish(),
  className: z.string().nullish(),
})

export type StudentWithClassRef = z.infer<typeof StudentWithClassRefSchema>

/**
 * Facilities(13). `campus` / `room` are the FULL API objects the old picker
 * stored, not {id,name} projections — carried through opaquely.
 */
export const FacilitiesRefSchema = z.object({
  campus: z.record(z.string(), z.unknown()).nullish(),
  room: z.record(z.string(), z.unknown()).nullish(),
})

export type FacilitiesRef = z.infer<typeof FacilitiesRefSchema>

/** Union of every per-type value shape, in both wire and form-state form. */
export type FieldValue =
  | string
  | number
  | boolean
  | string[]
  | AttachmentValue[]
  | PersonRef[]
  | PersonRef
  | StudentWithClassRef
  | FacilitiesRef
  | null

// ---------------------------------------------------------------------------
// FieldDto / AnswerDto
// ---------------------------------------------------------------------------

/**
 * One form field. `type` is intentionally a plain int, NOT FieldTypeSchema:
 * FormFieldJsonMapper.ResolveEffectiveType passes any declared value outside
 * 12..15 straight through, so a legacy row storing e.g. 99 arrives as 99 and a
 * strict 0..15 parse would white-screen the whole request detail. Use
 * `isFieldType()` / `resolveFieldType()` to narrow.
 *
 * `value` is `unknown` here for the same reason — lib/requests/field-value.ts
 * owns the per-type narrowing and never throws on a malformed legacy value.
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
})

export type Field = z.infer<typeof FieldSchema>

const answerEnvelope = {
  fieldId: z.string(),
  inputKey: z.string(),
}

/**
 * One posted answer, discriminated on `type`. The trailing permissive branch
 * catches a field whose stored type is outside 0..15 (see FieldSchema.type) —
 * the mapper treats those as string pass-throughs rather than rejecting them.
 */
export const AnswerSchema = z.union([
  z.discriminatedUnion("type", [
    z.object({
      ...answerEnvelope,
      type: z.literal(0),
      value: z.string().nullable(),
    }),
    z.object({
      ...answerEnvelope,
      type: z.literal(1),
      value: z.string().nullable(),
    }),
    z.object({
      ...answerEnvelope,
      type: z.literal(2),
      value: z.string().nullable(),
    }),
    z.object({
      ...answerEnvelope,
      type: z.literal(3),
      value: z.string().nullable(),
    }),
    z.object({ ...answerEnvelope, type: z.literal(4), value: z.boolean() }),
    z.object({
      ...answerEnvelope,
      type: z.literal(5),
      value: z.array(z.string()),
    }),
    z.object({
      ...answerEnvelope,
      type: z.literal(6),
      value: z.array(AttachmentValueSchema),
    }),
    z.object({
      ...answerEnvelope,
      type: z.literal(7),
      value: z.string().nullable(),
    }),
    z.object({
      ...answerEnvelope,
      type: z.literal(8),
      value: z.number().nullable(),
    }),
    z.object({
      ...answerEnvelope,
      type: z.literal(9),
      value: z.array(PersonRefSchema),
    }),
    z.object({
      ...answerEnvelope,
      type: z.literal(10),
      value: PersonRefSchema.nullable(),
    }),
    z.object({
      ...answerEnvelope,
      type: z.literal(11),
      value: PersonRefSchema.nullable(),
    }),
    z.object({
      ...answerEnvelope,
      type: z.literal(12),
      value: z.string().nullable(),
    }),
    z.object({
      ...answerEnvelope,
      type: z.literal(13),
      value: FacilitiesRefSchema.nullable(),
    }),
    z.object({
      ...answerEnvelope,
      type: z.literal(14),
      value: z.number().nullable(),
    }),
    z.object({
      ...answerEnvelope,
      type: z.literal(15),
      value: StudentWithClassRefSchema.nullable(),
    }),
  ]),
  z.object({ ...answerEnvelope, type: z.number().int(), value: z.unknown() }),
])

export type Answer = z.infer<typeof AnswerSchema>

// ---------------------------------------------------------------------------
// Enums pinned from v1 code
// ---------------------------------------------------------------------------

/**
 * RequestFormStatusEnum (GeeO.Data/Models/RequestForm.cs:44).
 * ⚠️ Draft is OUT of numeric order — a `1..6` range check silently drops it.
 */
export const RequestFormStatus = {
  Draft: 100,
  New: 1,
  Processing: 2,
  DoneApproved: 3,
  DoneDenied: 4,
  Closed: 5,
  Expired: 6,
} as const

export type RequestFormStatusValue =
  (typeof RequestFormStatus)[keyof typeof RequestFormStatus]

export const REQUEST_FORM_STATUS_VALUES = [100, 1, 2, 3, 4, 5, 6] as const

/** Terminal statuses — no transition is accepted (API answers 422 REQUEST_TERMINAL). */
export const TERMINAL_REQUEST_STATUSES: readonly number[] = [3, 4, 5, 6]

/**
 * WorkFlowStatusEnum (GeeO.Data/Models/RequestFormHandleWorkFlow.cs:24) —
 * RequestFormHandleWorkFlow.StageStatus.
 * ⚠️ A deny on the FINAL step sets Done(4), not Denied(3), and discards the
 * note — never present stageStatus alone as approved-vs-rejected.
 */
export const WorkFlowStatus = {
  Processing: 1,
  Solve: 2,
  Denied: 3,
  Done: 4,
  Expired: 5,
} as const

export type WorkFlowStatusValue =
  (typeof WorkFlowStatus)[keyof typeof WorkFlowStatus]

/** ProcessStatusEnum (GeeO.Data/Models/FormTemplateProcess.cs). */
export const ProcessStatus = {
  New: 1,
  Inprocessing: 2,
  Solve: 3,
  Denied: 4,
  Done: 5,
  Closed: 6,
} as const

/** ProcessActionEnum — on FormTemplateProcess/RequestFormProcess only. */
export const ProcessAction = {
  NotYet: 0,
  Approved: 1,
  Denied: 2,
} as const

/**
 * TypeApprovalId. The BE C# `TypeApprovalIdEnum` is stale in BOTH range and
 * labels (declares 1..3 with wrong names); the old-FE authoring enum is
 * canonical and the code branches on 4.
 */
export const TypeApprovalId = {
  User: 1,
  Role: 2,
  GroupInHose: 3,
  GroupAll: 4,
} as const

export type TypeApprovalIdValue =
  (typeof TypeApprovalId)[keyof typeof TypeApprovalId]

// ---------------------------------------------------------------------------
// DTO schemas (camelCase JSON) — mirror the contract's "DTO schemas" section
// ---------------------------------------------------------------------------

/** UserOptionDto — approver candidates, resolvedApprovers, step approvers. */
export const UserOptionDtoSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string().nullish(),
})

export type UserOptionDto = z.infer<typeof UserOptionDtoSchema>

/** TokenDto — approve / deny / assign / archive / worklog-save responses. */
export const TokenDtoSchema = z.object({
  updatedAt: z.string(),
})

export type TokenDto = z.infer<typeof TokenDtoSchema>

/** TabCountsDto — POST /query/counts. */
export const TabCountsDtoSchema = z.object({
  action: z.number(),
  created: z.number(),
  viewer: z.number(),
})

export type TabCountsDto = z.infer<typeof TabCountsDtoSchema>

/** AvailableTemplateDto — GET /templates/available. */
export const AvailableTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  collectionId: z.string().nullish(),
  collectionName: z.string().nullish(),
  expirationCycle: z.number(),
})

export type AvailableTemplate = z.infer<typeof AvailableTemplateSchema>

/** SubmitTemplateDto — GET /templates/{id}/for-submit and the worklog step. */
export const SubmitTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  fields: z.array(FieldSchema),
})

export type SubmitTemplate = z.infer<typeof SubmitTemplateSchema>

/** RequestSummaryDto — POST / (submit) response. */
export const RequestSummarySchema = z.object({
  id: z.string(),
  subject: z.string(),
  formStatus: z.number(),
  createdDate: z.string(),
  updatedAt: z.string(),
})

export type RequestSummary = z.infer<typeof RequestSummarySchema>

/** ActivityDto — GET /{id}/activities, newest first. */
export const ActivityDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  fullName: z.string(),
  formStatus: z.number(),
  note: z.string(),
  createdDate: z.string(),
})

export type ActivityDto = z.infer<typeof ActivityDtoSchema>

/** CommentDto — GET/POST /{id}/comments, threaded via rootId, oldest first. */
export const CommentDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  fullName: z.string(),
  rootId: z.string().nullish(),
  content: z.string(),
  attachments: z.array(z.object({ url: z.string(), fileName: z.string() })),
  createdDate: z.string(),
})

export type CommentDto = z.infer<typeof CommentDtoSchema>

/** StepDto — the stepper. */
export const StepDtoSchema = z.object({
  id: z.string(),
  processName: z.string(),
  description: z.string().nullish(),
  processOrder: z.number(),
  processStatus: z.number(),
  processAction: z.number(),
  typeApprovalId: z.number(),
  nextProcessIfDeniedId: z.string().nullish(),
  // ⚠️ `int?` on the BE (RequestDtos.cs — `public int? StageStatus`): a step
  // with no handle-workflow row yet carries NO status, so `null` is a normal
  // value and not an error.
  stageStatus: z.number().nullish(),
  needToDo: z.boolean(),
  worklogTemplateId: z.string().nullish(),
  processById: z.string().nullish(),
  processByName: z.string().nullish(),
  processAt: z.string().nullish(),
  workLogById: z.string().nullish(),
  workLogByName: z.string().nullish(),
  workLogAt: z.string().nullish(),
  note: z.string().nullish(),
  approvers: z.array(UserOptionDtoSchema),
})

export type StepDto = z.infer<typeof StepDtoSchema>

/**
 * RequestListItemDto — POST /query.
 * ⚠️ `updatedAt` is the OPAQUE concurrency token, not a display value: rows
 * never touched by EF carry the SQL `getdate()` LOCAL time. Display
 * `lastModified` / `createdDate` instead.
 */
export const RequestListItemSchema = z.object({
  id: z.string(),
  subject: z.string(),
  templateId: z.string(),
  templateName: z.string(),
  collectionId: z.string().nullish(),
  collectionName: z.string().nullish(),
  formStatus: z.number(),
  createdById: z.string(),
  createdByName: z.string(),
  createdDate: z.string(),
  lastModified: z.string().nullish(),
  expiredDate: z.string().nullish(),
  updatedAt: z.string(),
  isArchived: z.boolean(),
  currentStepName: z.string().nullish(),
  currentStepIndex: z.number(),
  canApprove: z.boolean(),
})

export type RequestListItem = z.infer<typeof RequestListItemSchema>

/**
 * RequestDetailDto — GET /{id}. RequestListItemDto plus the runtime state.
 * `canApprove` / `canAssign` / `needToDo` / `worklogFilled` /
 * `resolvedApprovers` are SERVER-COMPUTED. The FE renders them and never
 * recomputes eligibility from roles.
 * ⚠️ `watchers` can contain duplicate userIds with divergent contact fields —
 * de-duplicate by `userId` before rendering or counting.
 */
export const RequestDetailSchema = RequestListItemSchema.extend({
  fields: z.array(FieldSchema),
  watchers: z.array(
    z.object({
      userId: z.string(),
      fullName: z.string(),
      email: z.string().nullish(),
    })
  ),
  processes: z.array(StepDtoSchema),
  currentWorkflowId: z.string().nullish(),
  canAssign: z.boolean(),
  needToDo: z.boolean(),
  worklogFilled: z.boolean(),
  resolvedApprovers: z.array(UserOptionDtoSchema),
  /** The request's hint groups (collection names). Absent on older servers. */
  hintGroups: z.array(z.string()).optional(),
})

export type RequestDetail = z.infer<typeof RequestDetailSchema>

export type RequestWatcher = RequestDetail["watchers"][number]

/**
 * WorkLogHistoryDto — GET /{id}/worklogs.
 * One entry per step that HAS a worklog (configured template or saved answers).
 * A step with a template but no saved answers comes back with `fields: []` and
 * a null `workLogByName` — that is how the FE shows "this step had a worklog
 * and it was never filled in".
 */
export const WorkLogHistorySchema = z.object({
  stepId: z.string(),
  stepName: z.string(),
  workLogById: z.string().nullish(),
  workLogByName: z.string().nullish(),
  workLogAt: z.string().nullish(),
  fields: z.array(FieldSchema),
})

export type WorkLogHistory = z.infer<typeof WorkLogHistorySchema>

// ---------------------------------------------------------------------------
// Request bodies
// ---------------------------------------------------------------------------

/** POST /query tabs — mutually exclusive, evaluated server-side. */
export const REQUEST_TABS = ["action", "created", "viewer"] as const
export type RequestTab = (typeof REQUEST_TABS)[number]

/** Sort allow-list — anything else is 400 VALIDATION_FAILED. */
export const REQUEST_SORT_FIELDS = [
  "createdDate",
  "subject",
  "updatedAt",
] as const

export interface RequestQueryRequest {
  tab: RequestTab
  collectionId?: string
  status?: number
  keyword?: string
  archived?: boolean
  page?: number
  pageSize?: number
  sort?: { field: (typeof REQUEST_SORT_FIELDS)[number]; desc?: boolean }[]
}

/** SubmitRequestBody — the `payload` multipart part of POST /. */
export interface SubmitRequestBody {
  templateId: string
  subject: string
  answers: Answer[]
}

// ---------------------------------------------------------------------------
// Data-driven denial codes (422, NEVER 403 — lib/api-client.ts redirects the
// whole SPA to /forbidden on any 403). Match on ApiError.problem?.errorCode,
// never on the `type` URI.
// ---------------------------------------------------------------------------

export const RequestErrorCode = {
  /** Someone else took the step — the caller is no longer the current approver. */
  NotEligible: "NOT_ELIGIBLE",
  /** The request already finished. */
  RequestTerminal: "REQUEST_TERMINAL",
  /** Fill the step's worklog first; carries a `processId` extension. */
  WorklogRequired: "WORKLOG_REQUIRED",
  /** A new value was sent for a degraded picker; carries a `fieldId` extension. */
  PickerNotEditable: "PICKER_NOT_EDITABLE",
  /** Stale If-Unmodified-Since; carries a `currentUpdatedAt` extension. */
  Conflict: "CONFLICT",
} as const

export type RequestErrorCodeValue =
  (typeof RequestErrorCode)[keyof typeof RequestErrorCode]
