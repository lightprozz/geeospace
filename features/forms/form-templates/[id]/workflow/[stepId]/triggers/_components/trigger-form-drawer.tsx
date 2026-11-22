'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import type {
  TriggerDto,
  CreateTriggerRequest,
  ProcessAction,
  HttpMethod,
  ParamDto,
  HeaderDto,
} from '../types/trigger'
import {
  normalizeProcessAction,
  normalizeHttpMethod,
} from '../types/trigger'
import {
  EventTypePicker,
} from './event-type-picker'
import { HttpMethodPicker } from './http-method-picker'
import { ParameterTable } from './parameter-table'
import { HeaderTable } from './header-table'
import { PayloadTemplateEditor } from './payload-template-editor'
import { ConditionExpressionBuilder } from './condition-expression-builder'
import {
  TriggerPrefillPicker,
  type TriggerPrefill,
} from './trigger-prefill-picker'

interface TriggerFormDrawerProps {
  open: boolean
  onClose: () => void
  existingTrigger?: TriggerDto | null
  onSave: (body: CreateTriggerRequest) => Promise<void>
  isLoading?: boolean
  /** The template's field keys — powers the payload chips and condition picker. */
  inputKeys?: ParamDto[]
  /** The owning template — powers the FG12 "copy from another trigger" prefill. */
  templateId?: string
}

interface FormState {
  triggerName: string
  processAction: ProcessAction | ''
  httpMethod: HttpMethod | ''
  apiUrl: string
  parameters: ParamDto[]
  headers: HeaderDto[]
  payloadTemplate: string
  isConditionTrigger: boolean
  conditionExpression: string
}

function emptyForm(): FormState {
  return {
    triggerName: '',
    processAction: 'APPROVED',
    httpMethod: 'POST',
    apiUrl: '',
    parameters: [],
    headers: [],
    payloadTemplate: '',
    isConditionTrigger: false,
    conditionExpression: '',
  }
}

function triggerToForm(t: TriggerDto): FormState {
  return {
    triggerName: t.triggerName,
    // W-H6: normalise the enum name or a legacy numeric ordinal.
    processAction: normalizeProcessAction(t.processAction),
    httpMethod: normalizeHttpMethod(t.httpMethod),
    apiUrl: t.apiUrl,
    parameters: t.parameters,
    headers: t.headers,
    payloadTemplate: t.payloadTemplate ?? '',
    isConditionTrigger: t.isConditionTrigger,
    conditionExpression: t.conditionExpression ?? '',
  }
}

export function TriggerFormDrawer({
  open,
  onClose,
  existingTrigger,
  onSave,
  isLoading,
  inputKeys = [],
  templateId,
}: TriggerFormDrawerProps) {
  const [form, setForm] = useState<FormState>(emptyForm())
  const [activeTab, setActiveTab] = useState('params')

  // Reset the form when the drawer opens (or when the edited trigger
  // changes). Adjusting state during render — rather than in an effect —
  // avoids the extra commit that an effect-based reset causes.
  const [syncedOpen, setSyncedOpen] = useState(open)
  const [syncedTrigger, setSyncedTrigger] = useState(existingTrigger)
  if (open !== syncedOpen || existingTrigger !== syncedTrigger) {
    setSyncedOpen(open)
    setSyncedTrigger(existingTrigger)
    if (open) {
      setForm(existingTrigger ? triggerToForm(existingTrigger) : emptyForm())
      setActiveTab('params')
    }
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  // FG12: seed the form from another trigger of the same template. The
  // trigger's name is intentionally NOT copied — the author must give the
  // new trigger its own name.
  const handlePrefill = (prefill: TriggerPrefill) => {
    setForm((prev) => ({
      ...prev,
      processAction: prefill.processAction,
      httpMethod: prefill.httpMethod,
      apiUrl: prefill.apiUrl,
      parameters: prefill.parameters,
      headers: prefill.headers,
      payloadTemplate: prefill.payloadTemplate,
      isConditionTrigger: prefill.isConditionTrigger,
      conditionExpression: prefill.conditionExpression,
    }))
  }

  const handleSave = async () => {
    if (!form.triggerName.trim()) {
      toast.error('Tên trigger là bắt buộc')
      return
    }
    if (!form.apiUrl.trim()) {
      toast.error('API URL là bắt buộc')
      return
    }
    if (!form.processAction) {
      toast.error('Loại sự kiện là bắt buộc')
      return
    }
    if (!form.httpMethod) {
      toast.error('HTTP method là bắt buộc')
      return
    }
    if (form.isConditionTrigger && !form.conditionExpression.trim()) {
      toast.error('Cần biểu thức điều kiện khi bật trigger có điều kiện')
      return
    }

    try {
      const body: CreateTriggerRequest = {
        processAction: form.processAction as ProcessAction,
        triggerName: form.triggerName.trim(),
        apiUrl: form.apiUrl.trim(),
        httpMethod: form.httpMethod as HttpMethod,
        parameters: form.parameters.filter((p) => p.key.trim()),
        headers: form.headers.filter((h) => h.key.trim()),
        payloadTemplate: form.payloadTemplate || null,
        isConditionTrigger: form.isConditionTrigger,
        conditionExpression: form.isConditionTrigger ? form.conditionExpression.trim() : undefined,
      }
      await onSave(body)
      toast.success(existingTrigger ? 'Đã cập nhật trigger' : 'Đã tạo trigger')
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không lưu được trigger'
      toast.error(msg)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {existingTrigger ? 'Sửa trigger' : 'Thêm trigger'}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="-mx-6 flex-1 px-6">
          <div className="space-y-4 py-4">
            {/* FG12: copy the configuration from another trigger of the
                same template. */}
            {templateId && (
              <TriggerPrefillPicker
                templateId={templateId}
                currentTriggerId={existingTrigger?.id ?? null}
                onPrefill={handlePrefill}
              />
            )}

            {/* Trigger name */}
            <div className="space-y-1">
              <Label htmlFor="trigger-name">Tên trigger *</Label>
              <Input
                id="trigger-name"
                value={form.triggerName}
                onChange={(e) => set('triggerName', e.target.value)}
                placeholder="Ví dụ: Gửi thông báo Slack khi duyệt"
              />
            </div>

            {/* Event type */}
            <div className="space-y-2">
              <Label>Loại sự kiện *</Label>
              <EventTypePicker
                value={form.processAction}
                onChange={(v) => set('processAction', v)}
              />
            </div>

            {/* HTTP method */}
            <div className="space-y-2">
              <Label>HTTP method *</Label>
              <HttpMethodPicker
                value={form.httpMethod}
                onChange={(v) => set('httpMethod', v)}
              />
            </div>

            {/* URL */}
            <div className="space-y-1">
              <Label htmlFor="api-url">API URL *</Label>
              <Input
                id="api-url"
                value={form.apiUrl}
                onChange={(e) => set('apiUrl', e.target.value)}
                placeholder="https://api.example.com/webhook"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Địa chỉ IP riêng và loopback bị chặn bởi cơ chế chống SSRF khi
                trigger chạy thật. Chế độ chạy thử là sandbox dành cho admin nên
                không bị áp dụng danh sách chặn này.
              </p>
            </div>

            <Separator />

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="params">Tham số</TabsTrigger>
                <TabsTrigger value="headers">Header</TabsTrigger>
                <TabsTrigger value="body">Body</TabsTrigger>
                <TabsTrigger value="condition">Điều kiện</TabsTrigger>
              </TabsList>

              <TabsContent value="params" className="space-y-2 py-2">
                <ParameterTable
                  value={form.parameters}
                  onChange={(v) => set('parameters', v)}
                />
              </TabsContent>

              <TabsContent value="headers" className="space-y-2 py-2">
                <HeaderTable
                  value={form.headers}
                  onChange={(v) => set('headers', v)}
                />
              </TabsContent>

              <TabsContent value="body" className="space-y-2 py-2">
                <p className="text-sm text-muted-foreground">
                  Body template với các placeholder {"{{inputKey}}"}. Để trống nếu
                  không gửi body.
                </p>
                <PayloadTemplateEditor
                  value={form.payloadTemplate}
                  onChange={(v) => set('payloadTemplate', v)}
                  inputKeys={inputKeys}
                />
              </TabsContent>

              <TabsContent value="condition" className="space-y-3 py-2">
                <div className="flex items-center gap-3">
                  <Switch
                    id="is-conditional"
                    checked={form.isConditionTrigger}
                    onCheckedChange={(v) => set('isConditionTrigger', v)}
                  />
                  <Label htmlFor="is-conditional">Trigger có điều kiện</Label>
                </div>
                {form.isConditionTrigger && (
                  <ConditionExpressionBuilder
                    value={form.conditionExpression}
                    onChange={(v) => set('conditionExpression', v)}
                    inputKeys={inputKeys}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingTrigger ? 'Lưu thay đổi' : 'Tạo trigger'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
