'use client'
// ---------------------------------------------------------------------------
// api/api-preview-client.tsx — Tabs view for webhook endpoints, payloads, auth
// ---------------------------------------------------------------------------

import { useMemo } from 'react'
import { ChevronLeft, KeyRound, Webhook } from 'lucide-react'
import { useRouter } from '@/features/forms/window-adapter'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSetDashboardHeader } from '@/features/forms/window-adapter'

import { useProcessesQuery } from '@/features/forms/form-templates/[id]/workflow/hooks/use-processes'
import { useTriggersQuery } from '@/features/forms/form-templates/[id]/workflow/[stepId]/triggers/hooks/use-triggers'
import { useTemplate } from '@/features/forms/form-templates/hooks/use-template'
import { FormTemplateBreadcrumb } from '@/features/forms/form-templates/_components/form-template-breadcrumb'
import type { ProcessStepDto } from '@/features/forms/form-templates/[id]/workflow/types/workflow'
import type { TriggerDto } from '@/features/forms/form-templates/[id]/workflow/[stepId]/triggers/types/trigger'

import { EndpointCard } from './endpoint-card'
import { PayloadSample } from './payload-sample'
import { ApiActivityLog, type ApiActivityEntry } from './_components/api-activity-log'
import { InboundApiCard } from './_components/inbound-api-card'
import {
  useTemplateApiHistoryQuery,
  useTemplateApiLinkQuery,
} from './hooks/use-api-link'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiPreviewClientProps {
  templateId: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ApiPreviewClient({ templateId }: ApiPreviewClientProps) {
  const router = useRouter()
  const processesQuery = useProcessesQuery(templateId)
  const { data: template } = useTemplate(templateId)
  const apiLinkQuery = useTemplateApiLinkQuery(templateId)
  const apiHistoryQuery = useTemplateApiHistoryQuery(templateId)

  // Header breadcrumb — same pattern as view-mode client
  useSetDashboardHeader({
    breadcrumbs: (
      <FormTemplateBreadcrumb
        id={templateId}
        templateName={template?.name}
        mode="api"
      />
    ),
  })

  const processes: ProcessStepDto[] = processesQuery.data ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Quay lại</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Xem trước API
            </h1>
            <p className="text-sm text-muted-foreground">
              Xem lại endpoint tiếp nhận biểu mẫu, payload webhook gửi đi và
              các yêu cầu xác thực của biểu mẫu này.
            </p>
          </div>
        </div>
      </div>

      {/* Inbound link — the machine-to-machine endpoint of this template */}
      <InboundApiCard
        link={apiLinkQuery.data ?? null}
        loading={apiLinkQuery.isLoading}
      />

      <Tabs defaultValue="endpoints">
        <TabsList className="grid w-full max-w-xl grid-cols-4">
          <TabsTrigger value="endpoints">Endpoint</TabsTrigger>
          <TabsTrigger value="payloads">Payload mẫu</TabsTrigger>
          <TabsTrigger value="auth">Xác thực</TabsTrigger>
          <TabsTrigger value="activity">Hoạt động</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="mt-4">
          <EndpointsTab templateId={templateId} processes={processes} loading={processesQuery.isLoading} />
        </TabsContent>
        <TabsContent value="payloads" className="mt-4">
          <PayloadsTab processes={processes} loading={processesQuery.isLoading} />
        </TabsContent>
        <TabsContent value="auth" className="mt-4">
          <AuthenticationTab />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <ActivityTab
            entries={mapApiHistoryToActivity(apiHistoryQuery.data ?? [])}
            loading={apiHistoryQuery.isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

function EndpointsTab({
  templateId,
  processes,
  loading,
}: {
  templateId: string
  processes: ProcessStepDto[]
  loading: boolean
}) {
  // Render each ProcessStep's triggers inline. We render all processes; the
  // PerStepTriggers component decides whether to show an empty placeholder.
  const sortedProcesses = useMemo(
    () => [...processes].sort((a, b) => a.processOrder - b.processOrder),
    [processes]
  )

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (sortedProcesses.length === 0) {
    return <EmptyState message="Biểu mẫu này chưa có bước quy trình nào." />
  }

  return (
    <div className="space-y-6">
      {/* V2 CRUD endpoints summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Endpoint CRUD Form Builder v2</CardTitle>
        </CardHeader>
        <CardContent>
          <CrudEndpoints templateId={templateId} />
        </CardContent>
      </Card>

      {/* Per-step outbound triggers */}
      {sortedProcesses.map((step) => (
        <PerStepTriggers key={step.id} step={step} />
      ))}
    </div>
  )
}

function CrudEndpoints({ templateId }: { templateId: string }) {
  // There is no DELETE endpoint on the v2 templates route — a template is
  // retired through the deactivate flow, not removed.
  const endpoints = [
    { method: 'GET' as const, path: `/api/v2/form-builder/templates/${templateId}` },
    { method: 'POST' as const, path: `/api/v2/form-builder/templates` },
    { method: 'PUT' as const, path: `/api/v2/form-builder/templates/${templateId}` },
  ]
  return (
    <div className="space-y-2 text-xs">
      {endpoints.map((e, i) => (
        <EndpointCard
          key={i}
          method={e.method}
          url={e.path}
          title="CRUD biểu mẫu"
          showCopy={true}
        />
      ))}
    </div>
  )
}

function PerStepTriggers({ step }: { step: ProcessStepDto }) {
  const triggersQuery = useTriggersQuery(step.id)
  const triggers: TriggerDto[] = triggersQuery.data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          Bước: {step.processName}{' '}
          <span className="text-xs text-muted-foreground ml-2">
            (thứ tự {step.processOrder})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {triggersQuery.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : triggers.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Chưa cấu hình trigger cho bước này.
          </p>
        ) : (
          triggers.map((trigger) => (
            <EndpointCard
              key={trigger.id}
              method={trigger.httpMethod}
              url={trigger.apiUrl}
              title={trigger.triggerName}
              description={`Sự kiện: ${trigger.processAction}${
                trigger.isConditionTrigger ? ' (có điều kiện)' : ''
              }`}
              headers={trigger.headers}
              parameters={trigger.parameters}
              showCopy={true}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}

function PayloadsTab({
  processes,
  loading,
}: {
  processes: ProcessStepDto[]
  loading: boolean
}) {
  const sortedProcesses = useMemo(
    () => [...processes].sort((a, b) => a.processOrder - b.processOrder),
    [processes]
  )

  if (loading) {
    return <Skeleton className="h-32 w-full" />
  }
  if (sortedProcesses.length === 0) {
    return <EmptyState message="Chưa có payload mẫu nào." />
  }

  return (
    <ScrollArea className="h-[60vh]">
      <div className="space-y-6 pr-2">
        {sortedProcesses.map((step) => (
          <PerStepPayloads key={step.id} step={step} />
        ))}
      </div>
    </ScrollArea>
  )
}

function PerStepPayloads({ step }: { step: ProcessStepDto }) {
  const triggersQuery = useTriggersQuery(step.id)
  const triggers: TriggerDto[] = triggersQuery.data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Bước: {step.processName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {triggersQuery.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : triggers.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Chưa định nghĩa payload nào.
          </p>
        ) : (
          triggers.map((trigger) => (
            <PayloadSample key={trigger.id} trigger={trigger} />
          ))
        )}
      </CardContent>
    </Card>
  )
}

function AuthenticationTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <KeyRound className="h-4 w-4" /> Xác thực
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Tất cả endpoint của form-builder và trigger gửi đi đều dùng xác thực
          Bearer token. Hãy đặt token trong header <code>Authorization</code>.
        </p>

        <div>
          <p className="font-medium mb-1">Tiếp nhận (CRUD Form Builder):</p>
          <pre className="rounded-md bg-muted p-3 font-mono text-xs overflow-x-auto">
{`Authorization: Bearer <access_token>
Content-Type: application/json`}
          </pre>
        </div>

        <div>
          <p className="font-medium mb-1">
            Gửi đi (webhook được kích hoạt):
          </p>
          <p className="text-xs text-muted-foreground mb-2">
            Token được chuyển tiếp trong header <code>Authorization</code> mặc
            định. Ghi đè tại bảng Header của từng trigger.
          </p>
          <pre className="rounded-md bg-muted p-3 font-mono text-xs overflow-x-auto">
{`Authorization: Bearer <inherited access_token>`}
          </pre>
        </div>

        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Lưu ý</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              Yêu cầu gửi đi đi tới URL được cấu hình cho từng trigger. Server
              áp dụng danh sách cho phép SSRF — liên kết tới host bên ngoài cần
              được Admin phê duyệt.
            </li>
            <li>
              Token được làm mới tự động trước 120 giây khi hết hạn qua
              AuthInitializer.
            </li>
            <li>
              Để kiểm thử thủ công, dùng thao tác &quot;Kích hoạt thử&quot;
              trong phần cài đặt của từng trigger.
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

function ActivityTab({
  entries,
  loading,
}: {
  entries: ApiActivityEntry[]
  loading: boolean
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Nhật ký hoạt động</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <ApiActivityLog
      entries={entries}
      emptyMessage="Chưa có yêu cầu nào được gửi qua liên kết API của biểu mẫu này."
    />
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * The inbound API history holds submissions, not webhook events, so the log
 * renders one row per request with its workflow status.
 */
function mapApiHistoryToActivity(
  history: Array<{
    id: string
    name: string
    createdByName: string | null
    createdByUserName: string | null
    createdDate: string
    formStatus: number
    isArchived: boolean
  }>
): ApiActivityEntry[] {
  return history.map((item) => ({
    id: item.id,
    status: activityStatusFor(item.formStatus, item.isArchived),
    action: item.name || 'Yêu cầu chưa đặt tên',
    actor: item.createdByName ?? item.createdByUserName ?? 'API',
    timestamp: item.createdDate,
  }))
}

function activityStatusFor(
  formStatus: number,
  isArchived: boolean
): ApiActivityEntry['status'] {
  // Approved (3) and Closed (5) are the successful terminal states; Denied (4)
  // and Expired (6) are the unsuccessful ones; the rest are still in flight.
  if (formStatus === 4 || formStatus === 6) return 'failed'
  if (formStatus === 3 || formStatus === 5) return 'success'
  if (isArchived) return 'success'
  return 'pending'
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
      <p className="text-sm">{message}</p>
    </div>
  )
}
