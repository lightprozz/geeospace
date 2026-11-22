// Trigger types — mirrors BE FormBuilderRequestDtos.cs TriggerDto + related types

export type ProcessAction = 'APPROVED' | 'DENIED' | 'WORKLOGGED'
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ParamDto {
  key: string
  value: string
}

export interface HeaderDto {
  key: string
  value: string
  /** Whether the trigger stores a value for this header. */
  hasValue?: boolean
}

/**
 * The mask the BE returns in place of a stored header secret when the caller
 * lacks `forms.template.admin`. Submitting this value back means "keep the
 * stored secret", never "store the mask".
 */
export const SECRET_MASK = '••••'

export function isMaskedValue(value: string): boolean {
  return value === SECRET_MASK
}

export interface TriggerDto {
  id: string
  processId: string
  processAction: ProcessAction
  triggerName: string
  apiUrl: string
  httpMethod: HttpMethod
  parameters: ParamDto[]
  headers: HeaderDto[]
  payloadTemplate: string | null
  conditionExpression: string | null
  isConditionTrigger: boolean
}

export interface CreateTriggerRequest {
  processAction: ProcessAction
  triggerName: string
  apiUrl: string
  httpMethod: HttpMethod
  parameters: ParamDto[]
  headers: HeaderDto[]
  payloadTemplate: string | null
  isConditionTrigger: boolean
  conditionExpression?: string
}

export interface TestFireRequest {
  sandboxAnswers: AnswerDto[]
}

export interface AnswerDto {
  inputKey: string
  value: string
}

export interface TriggerTestFireResultDto {
  statusCode: number | null
  responseBody: string | null
  elapsedMs: number
  error: string | null
}

export interface ApiConfigDto {
  id: string
  processId: string
  functionType: string
  /** Human-readable label. Defaults to the function type on the BE. */
  triggerName: string
  processAction: ProcessAction
  apiUrl: string
  httpMethod: HttpMethod
  parameters: ParamDto[]
}

export interface CreateApiConfigRequest {
  functionType: string
  triggerName: string
  processAction: ProcessAction
  apiUrl: string
  httpMethod: HttpMethod
  parameters: ParamDto[]
}

export const PROCESS_ACTION_LABELS: Record<ProcessAction, string> = {
  APPROVED: 'Khi duyệt',
  DENIED: 'Khi từ chối',
  WORKLOGGED: 'Khi ghi nhận công',
}

export const HTTP_METHOD_LABELS: Record<HttpMethod, string> = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
}

export const VALID_PROCESS_ACTIONS: ProcessAction[] = ['APPROVED', 'DENIED', 'WORKLOGGED']
export const VALID_HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

/** EVENT_TRIGGER_TYPE ordinals, as stored by the BE. */
const PROCESS_ACTION_BY_ORDINAL: ProcessAction[] = ['APPROVED', 'DENIED', 'WORKLOGGED']

/** W-H6 guard: the BE maps `ProcessAction` to the enum name, but a row that
 *  predates that fix still carries the numeric ordinal. Normalise both, so the
 *  form never shows a raw number and never sends one back. */
export function normalizeProcessAction(value: unknown): ProcessAction | '' {
  if (typeof value === 'number') {
    return PROCESS_ACTION_BY_ORDINAL[value] ?? ''
  }
  if (typeof value !== 'string') return ''
  const upper = value.toUpperCase()
  if (VALID_PROCESS_ACTIONS.includes(upper as ProcessAction)) {
    return upper as ProcessAction
  }
  // A numeric string ("0"/"1"/"2") from an unfixed BE response.
  const asNumber = Number(value)
  if (Number.isInteger(asNumber)) {
    return PROCESS_ACTION_BY_ORDINAL[asNumber] ?? ''
  }
  return ''
}

/** Same normalisation for the HTTP method. */
export function normalizeHttpMethod(value: unknown): HttpMethod | '' {
  if (typeof value !== 'string') return ''
  const upper = value.toUpperCase()
  return VALID_HTTP_METHODS.includes(upper as HttpMethod) ? (upper as HttpMethod) : ''
}
