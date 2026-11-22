'use client'

// ---------------------------------------------------------------------------
// app/(dashboard)/form-templates/worklog-templates/new/page.tsx
// Create new WorkLog template — reuses Sub-1 field editor
// ---------------------------------------------------------------------------

import { useRouter } from '@/features/forms/window-adapter'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSetDashboardHeader } from '@/features/forms/window-adapter'
import { createWorkLogTemplate } from '@/features/lms/lib/form-templates/api'
import { WorkLogTemplateEditorForm } from '../_components/worklog-template-editor-form'

export default function NewWorkLogTemplatePage() {
  const router = useRouter()

  useSetDashboardHeader({
    breadcrumbs: (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span>Tạo mẫu worklog</span>
      </div>
    ),
  })

  async function handleSubmit(data: Parameters<typeof WorkLogTemplateEditorForm>[0]['onSubmit'] extends (data: infer T) => unknown ? T : never) {
    await createWorkLogTemplate({
      ...data,
      templateType: 'WorkLog',
    })
    router.push('/form-templates/worklog-templates')
  }

  return (
    <WorkLogTemplateEditorForm
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
    />
  )
}
