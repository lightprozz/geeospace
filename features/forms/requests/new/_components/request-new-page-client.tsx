'use client'
// ---------------------------------------------------------------------------
// _components/request-new-page-client.tsx
// Template picker for a NEW request. This is the page the primary-nav
// "Submit Request" entry points at, and the landing page after a successful
// submission — it lists the templates the caller may submit and links into
// the submit form.
// ---------------------------------------------------------------------------

import { useCallback } from 'react'
import { useRouter } from '@/features/forms/window-adapter'
import { FileText, Folder } from 'lucide-react'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSetDashboardHeader } from '@/features/forms/window-adapter'
import { useAvailableTemplates } from '@/features/lms/hooks/requests/use-available-templates'

export function RequestNewPageClient() {
  const router = useRouter()
  const { data: templates, isLoading, isError } = useAvailableTemplates()

  const handleSelect = useCallback(
    (templateId: string) => {
      router.push(`/requests/new/${templateId}`)
    },
    [router],
  )

  useSetDashboardHeader({
    breadcrumbs: (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="text-xs text-muted-foreground">
              New Request
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    ),
    actions: (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 text-xs"
        onClick={() => router.push('/requests')}
      >
        Back to Requests
      </Button>
    ),
  })

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="shrink-0 border-b px-6 py-4">
        <h1 className="text-lg font-semibold text-foreground">New Request</h1>
        <p className="text-sm text-muted-foreground">
          Select a template to start a new request.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2 rounded-lg border p-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <FileText className="h-10 w-10 text-destructive" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">
              Could not load templates
            </p>
            <p className="text-xs text-muted-foreground">
              Please try again. If the problem persists, contact your administrator.
            </p>
          </div>
        ) : templates && templates.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelect(t.id)}
                className="flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="flex w-full items-start gap-2">
                  <FileText
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 truncate text-sm font-medium">{t.name}</span>
                </div>

                {t.description ? (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {t.description}
                  </p>
                ) : null}

                {t.collectionName ? (
                  <div className="flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className="px-1.5 py-0 text-[10px]"
                    >
                      <Folder className="mr-0.5 h-2.5 w-2.5" />
                      {t.collectionName}
                    </Badge>
                  </div>
                ) : null}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground opacity-30" aria-hidden="true" />
            <p className="text-sm font-medium text-muted-foreground">
              No templates available
            </p>
            <p className="text-xs text-muted-foreground">
              Contact your administrator to create a request template.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
