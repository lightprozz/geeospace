'use client'
// ---------------------------------------------------------------------------
// _components/form-template-breadcrumb.tsx
// Shared breadcrumb injected into the dashboard header for every form
// template page (View / Edit / Process / API). Keeps the trail consistent
// across modes and exposes a mode-aware label so the user always knows which
// editor they are in.
// ---------------------------------------------------------------------------

import Link from '@/features/forms/window-adapter'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export type FormTemplateMode = 'view' | 'edit' | 'process' | 'api'

const MODE_LABEL: Record<FormTemplateMode, string> = {
  view: 'Xem',
  edit: 'Sửa',
  process: 'Quy trình',
  api: 'API',
}

export function FormTemplateBreadcrumb({
  id,
  templateName,
  mode,
}: {
  id: string
  /** Empty until the template loads; the trail still links to the detail page. */
  templateName?: string
  mode: FormTemplateMode
}) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/form-templates">Biểu mẫu</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={`/form-templates/${id}`}>{templateName || '…'}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{MODE_LABEL[mode]}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export { MODE_LABEL }
