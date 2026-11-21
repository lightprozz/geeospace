// ---------------------------------------------------------------------------
// api/types/api-link.ts — Inbound API link + history types (BE TemplateDtos.cs)
// ---------------------------------------------------------------------------

export interface TemplateApiHeaderDto {
  key: string
  value: string
}

export interface TemplateApiLinkDto {
  id: string
  templateId: string
  /** Relative path of the inbound endpoint, e.g. `api/requestform/create-from-template/{id}`. */
  apiUrl: string
  method: string
  contentType: string | null
  headers: TemplateApiHeaderDto[]
  /** Request body template as stored (JSON). */
  body: string | null
  /** The secret key, masked for callers without `forms.template.admin`. */
  apiKey: string
  /** True when a secret key exists, even when its value is masked. */
  hasApiKey: boolean
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface TemplateApiHistoryDto {
  id: string
  name: string
  createdByName: string | null
  createdByUserName: string | null
  createdDate: string
  expiredDate: string | null
  formStatus: number
  isArchived: boolean
}
