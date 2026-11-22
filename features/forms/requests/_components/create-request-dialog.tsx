// ---------------------------------------------------------------------------
// create-request-dialog.tsx — Template picker grid → navigate to submit page
// ---------------------------------------------------------------------------

import { FileText, Folder, X } from 'lucide-react'
import { useRouter } from '@/features/forms/window-adapter'
import { useCallback } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useAvailableTemplates } from '@/features/lms/hooks/requests/use-available-templates'

interface CreateRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  collectionId?: string | null
}

export function CreateRequestDialog({
  open,
  onOpenChange,
  collectionId,
}: CreateRequestDialogProps) {
  const router = useRouter()
  const { data: templates, isLoading } = useAvailableTemplates(collectionId ?? undefined, {
    enabled: open,
  })

  const handleSelectTemplate = useCallback(
    (templateId: string) => {
      onOpenChange(false)
      router.push(`/requests/new/${templateId}`)
    },
    [onOpenChange, router],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Request</DialogTitle>
          <DialogDescription>
            Select a template to start a new request.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 mt-2">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : templates && templates.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTemplate(t.id)}
                  className="flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex w-full items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm font-medium truncate">{t.name}</span>
                    </div>
                    <X className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </div>

                  {t.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {t.description}
                    </p>
                  )}

                  {t.collectionName && (
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        <Folder className="h-2.5 w-2.5 mr-0.5" />
                        {t.collectionName}
                      </Badge>
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground opacity-30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                No templates available
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Contact your administrator to create a request template.
              </p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
