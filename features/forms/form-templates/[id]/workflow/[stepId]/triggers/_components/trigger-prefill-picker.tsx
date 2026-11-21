'use client'
// ---------------------------------------------------------------------------
// trigger-prefill-picker.tsx
// FG12 — "Template Trigger" prefill.
//
// Lets the author copy an existing trigger's configuration (event type,
// HTTP method, URL, parameters, headers, body template, condition) from any
// other process of the same template into the trigger being edited. This
// ports the v1 `get-form-template-trigger` helper, which listed the
// template's triggers so a new trigger could be seeded from one.
//
// Secrets are deliberately NOT copied: the BE masks stored header values for
// callers without `forms.template.admin`, and a masked value submitted back
// means "keep the stored secret" — which is meaningless for a brand-new
// trigger. Masked headers are therefore dropped from the copy.
// ---------------------------------------------------------------------------

import { useMemo, useState } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useTemplateTriggers } from '../hooks/use-template-triggers'
import { isMaskedValue } from '../types/trigger'
import type {
  HeaderDto,
  HttpMethod,
  ParamDto,
  ProcessAction,
} from '../types/trigger'

export interface TriggerPrefill {
  processAction: ProcessAction | ''
  httpMethod: HttpMethod | ''
  apiUrl: string
  parameters: ParamDto[]
  headers: HeaderDto[]
  payloadTemplate: string
  isConditionTrigger: boolean
  conditionExpression: string
}

interface TriggerPrefillPickerProps {
  templateId: string
  /** The trigger currently being edited — excluded from the list. */
  currentTriggerId?: string | null
  onPrefill: (prefill: TriggerPrefill) => void
}

export function TriggerPrefillPicker({
  templateId,
  currentTriggerId,
  onPrefill,
}: TriggerPrefillPickerProps) {
  const { triggers, isLoading } = useTemplateTriggers(templateId)
  const [selected, setSelected] = useState<string>('')

  const candidates = useMemo(
    () => triggers.filter((t) => t.id !== currentTriggerId),
    [triggers, currentTriggerId],
  )

  // Group by owning process so the list stays readable on templates with
  // many steps.
  const groups = useMemo(() => {
    const byProcess = new Map<
      string,
      { name: string; order: number; items: typeof candidates }
    >()
    for (const trigger of candidates) {
      const key = trigger.processId
      const existing = byProcess.get(key)
      if (existing) {
        existing.items.push(trigger)
      } else {
        byProcess.set(key, {
          name: trigger.processName,
          order: trigger.processOrder,
          items: [trigger],
        })
      }
    }
    return [...byProcess.values()].sort((a, b) => a.order - b.order)
  }, [candidates])

  const handleSelect = (triggerId: string) => {
    const source = candidates.find((t) => t.id === triggerId)
    if (!source) return
    onPrefill({
      processAction: source.processAction,
      httpMethod: source.httpMethod,
      apiUrl: source.apiUrl,
      parameters: source.parameters.map((p) => ({ ...p })),
      headers: source.headers
        .filter((h) => !isMaskedValue(h.value))
        .map((h) => ({ ...h })),
      payloadTemplate: source.payloadTemplate ?? '',
      isConditionTrigger: source.isConditionTrigger,
      conditionExpression: source.conditionExpression ?? '',
    })
    toast.success(`Đã sao chép cấu hình từ trigger "${source.triggerName}"`)
  }

  // Nothing to copy from — the picker would be dead UI.
  if (!isLoading && candidates.length === 0) {
    return null
  }

  return (
    <div className="space-y-1">
      <Label htmlFor="trigger-prefill">Sao chép từ trigger khác</Label>
      <Select
        value={selected}
        onValueChange={(value) => {
          setSelected(value)
          handleSelect(value)
        }}
        disabled={isLoading}
      >
        <SelectTrigger id="trigger-prefill" className="w-full">
          <SelectValue
            placeholder={
              isLoading
                ? 'Đang tải trigger của template…'
                : 'Chọn một trigger để sao chép…'
            }
          />
        </SelectTrigger>
        <SelectContent>
          {groups.map((group) => (
            <SelectGroup key={group.name + group.order}>
              <SelectLabel>{group.name}</SelectLabel>
              {group.items.map((trigger) => (
                <SelectItem key={trigger.id} value={trigger.id}>
                  {trigger.triggerName}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Sao chép loại sự kiện, HTTP method, URL, parameters, headers, body template và
        điều kiện. Tên trigger không bị sao chép.
      </p>
    </div>
  )
}
