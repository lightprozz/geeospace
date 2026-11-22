'use client'

// ---------------------------------------------------------------------------
// app/(dashboard)/form-templates/worklog-templates/[id]/edit/page.tsx
// Edit existing WorkLog template — reuses Sub-1 field editor
// ---------------------------------------------------------------------------

import { Suspense } from 'react'
import { useParams, useRouter } from '@/features/forms/window-adapter'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSetDashboardHeader } from '@/features/forms/window-adapter'
import { useWorkLogTemplateQuery, useWorkLogTemplateMutation } from '../../_components/use-worklog-templates'
import { WorkLogTemplateEditorForm } from '../../_components/worklog-template-editor-form'

function LoadingSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="flex-1 min-h-0 rounded-2xl" />
    </div>
  )
}

function EditWorkLogTemplateClient() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: template, isLoading } = useWorkLogTemplateQuery(id)
  const mutation = useWorkLogTemplateMutation()

  useSetDashboardHeader({
    breadcrumbs: (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span>{template?.name ?? 'Sửa mẫu worklog'}</span>
      </div>
    ),
  })

  async function handleSubmit(
    data: {
      name: string
      description?: string | null
      collectionId?: string | null
      fields: Array<{
        id?: string | null
        fieldName: string
        label: string
        description?: string | null
        type: number
        inputKey: string
        required: boolean
        displayOrder: number
        hidden: boolean
        config: Record<string, unknown>
      }>
    },
    ifUnmodifiedSince?: string,
  ) {
    await mutation.mutateAsync({
      id,
      request: {
        name: data.name,
        description: data.description,
        collectionId: data.collectionId,
        fields: data.fields,
      },
      ifUnmodifiedSince,
    })
    router.push('/form-templates/worklog-templates')
  }

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (!template) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Không tìm thấy mẫu.</p>
      </div>
    )
  }

  return (
    <WorkLogTemplateEditorForm
      initialData={template}
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
    />
  )
}

export default function EditWorkLogTemplatePage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <EditWorkLogTemplateClient />
    </Suspense>
  )
}
