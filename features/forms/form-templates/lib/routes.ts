// ---------------------------------------------------------------------------
// lib/routes.ts — Route constants for the form-templates module
// ---------------------------------------------------------------------------

export const TEMPLATES_ROUTES = {
  LIST: "/form-templates",
  NEW: "/form-templates/new",
  DETAIL: (id: string) => `/form-templates/${id}`,
  EDIT: (id: string) => `/form-templates/${id}/edit`,
} as const

export const API_ROUTES = {
  TEMPLATES: "/api/v2/form-builder/templates",
  TEMPLATE: (id: string) => `/api/v2/form-builder/templates/${id}`,
  TEMPLATE_TOGGLE: (id: string) => `/api/v2/form-builder/templates/${id}/toggle-activate`,
  TEMPLATE_ACTIVE: (id: string) => `/api/v2/form-builder/templates/${id}/active`,
  FIELDS: (templateId: string) => `/api/v2/form-builder/templates/${templateId}/fields`,
  FIELD: (templateId: string, fieldId: string) =>
    `/api/v2/form-builder/templates/${templateId}/fields/${fieldId}`,
  FIELDS_REORDER: (templateId: string) =>
    `/api/v2/form-builder/templates/${templateId}/fields/reorder`,
} as const
