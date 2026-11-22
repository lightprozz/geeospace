// ---------------------------------------------------------------------------
// api/lib/api.ts — Inbound API link + history client
// ---------------------------------------------------------------------------

import { api } from '@/features/lms/lib/transport'
import type { TemplateApiHistoryDto, TemplateApiLinkDto } from '../types/api-link'

/**
 * GET /api/v2/form-builder/templates/{id}/api-link
 *
 * Returns 404 when the template has no inbound link yet.
 */
export async function fetchTemplateApiLink(
  templateId: string,
): Promise<TemplateApiLinkDto> {
  return api.get<TemplateApiLinkDto>(
    `/api/v2/form-builder/templates/${encodeURIComponent(templateId)}/api-link`,
  )
}

/**
 * GET /api/v2/form-builder/templates/{id}/api-history
 *
 * The requests submitted through this template's inbound API link.
 */
export async function fetchTemplateApiHistory(
  templateId: string,
): Promise<TemplateApiHistoryDto[]> {
  return api.get<TemplateApiHistoryDto[]>(
    `/api/v2/form-builder/templates/${encodeURIComponent(templateId)}/api-history`,
  )
}
