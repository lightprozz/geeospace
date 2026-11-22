'use client'
// ---------------------------------------------------------------------------
// api/payload-sample.tsx — Renders trigger payload template (with {{inputKey}}
// placeholders) in a dark IDE-style code block + Copy button
// ---------------------------------------------------------------------------

import type { TriggerDto } from '@/features/forms/form-templates/[id]/workflow/[stepId]/triggers/types/trigger'
import { DarkJsonPre } from './_components/dark-json-pre'

interface PayloadSampleProps {
  trigger: TriggerDto
  /** Substituted sample values for {{inputKey}} placeholders */
  mockValues?: Record<string, string>
}

const DEFAULT_MOCK_VALUES: Record<string, string> = {
  requestId: 'REQ-2026-0001',
  requestSubject: 'Đề xuất …',
  approverFullName: 'Nguyễn Văn A',
  requesterFullName: 'Trần Thị B',
  campusName: 'GeeO Nguyễn Du',
}

function substitutePlaceholders(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (key in values) return JSON.stringify(values[key])
    return match
  })
}

export function PayloadSample({ trigger, mockValues }: PayloadSampleProps) {
  const values = mockValues ?? DEFAULT_MOCK_VALUES
  const samplePayload = trigger.payloadTemplate
    ? substitutePlaceholders(trigger.payloadTemplate, values)
    : `// Chưa cấu hình payload template cho "${trigger.triggerName}".`

  return (
    <DarkJsonPre code={samplePayload} title={trigger.triggerName} />
  )
}
