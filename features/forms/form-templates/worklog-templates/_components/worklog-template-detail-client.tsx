'use client'

// ---------------------------------------------------------------------------
// _components/worklog-template-detail-client.tsx — WorkLog template detail view
// ---------------------------------------------------------------------------

import { useParams, useRouter } from '@/features/forms/window-adapter'
import { ArrowLeft, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useSetDashboardHeader } from '@/features/forms/window-adapter'
import { fetchWorkLogTemplate } from '@/features/lms/lib/form-templates/api'
import { useQuery } from '@tanstack/react-query'

export function WorkLogTemplateDetailClient() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: template, isLoading } = useQuery({
    queryKey: ['worklog-templates', id],
    queryFn: () => fetchWorkLogTemplate(id),
    enabled: !!id,
  })

  useSetDashboardHeader({
    breadcrumbs: (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span>{template?.name ?? 'Mẫu worklog'}</span>
      </div>
    ),
    actions: template ? (
      <Button asChild>
        <a href={`/form-templates/worklog-templates/${id}/edit`}>
          <Pencil className="h-4 w-4 mr-1" />
          Sửa
        </a>
      </Button>
    ) : undefined,
  })

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-4 p-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="flex-1 min-h-0 rounded-2xl" />
      </div>
    )
  }

  if (!template) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Không tìm thấy mẫu.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">
      {/* Header card */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{template.name}</h1>
            {template.description && (
              <p className="mt-1 text-muted-foreground">{template.description}</p>
            )}
            <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  template.deactivate
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {template.deactivate ? 'Không hoạt động' : 'Hoạt động'}
              </span>
              {template.collectionName && (
                <span>Collection: {template.collectionName}</span>
              )}
              <span>Đã tạo: {new Date(template.createdDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Fields */}
      <Card className="flex-1 p-6">
        <h2 className="mb-4 font-semibold">
          Trường ({template.fields.length})
        </h2>
        {template.fields.length === 0 ? (
          <p className="text-muted-foreground">Chưa định nghĩa trường nào.</p>
        ) : (
          <div className="space-y-3">
            {template.fields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{field.label}</span>
                    {field.required && (
                      <span className="text-destructive text-xs">Bắt buộc</span>
                    )}
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      Kiểu {field.type}
                    </span>
                  </div>
                  {field.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {field.description}
                    </p>
                  )}
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {field.fieldName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
