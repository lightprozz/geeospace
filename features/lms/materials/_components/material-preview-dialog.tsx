'use client'
// ---------------------------------------------------------------------------
// _components/material-preview-dialog.tsx
// iframe-based material preview — supports file view + YouTube embed
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { FilePreview } from './file-preview'
import {
  FileText,
  Video,
  Image,
  Code2,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getMaterialViewUrl } from '@/features/lms/lib/materials/api'
import type { MaterialListItem, MaterialFormatInt } from '@/features/lms/types/material'

// ---------------------------------------------------------------------------
// YouTube URL helpers
// ---------------------------------------------------------------------------

function toYouTubeEmbed(url: string): string | null {
  // https://www.youtube.com/watch?v=xxx → https://www.youtube.com/embed/xxx
  const watchMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.+&v=)([^&]+)/,
  )
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`

  // https://youtu.be/xxx → https://www.youtube.com/embed/xxx
  const shortMatch = url.match(/youtu\.be\/([^?]+)/)
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`

  // Already embed URL
  if (url.includes('youtube.com/embed/')) return url

  return null
}

// ---------------------------------------------------------------------------
// Format icons
// ---------------------------------------------------------------------------

const FORMAT_ICONS: Partial<Record<MaterialFormatInt, React.ElementType>> = {
  1: Image,
  2: Video,
  3: FileText,
  5: Code2,
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MaterialPreviewDialogProps {
  open: boolean
  material: MaterialListItem | null
  onClose: () => void
}

export function MaterialPreviewDialog({
  open,
  material,
  onClose,
}: MaterialPreviewDialogProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false)

  if (!material) return null

  const previewUrl = getPreviewUrl(material)
  const openUrl = getOpenUrl(material)
  const FormatIcon =
    material.materialFormat ? FORMAT_ICONS[material.materialFormat] ?? FileText : FileText

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setIframeLoaded(false)
          onClose()
        }
      }}
    >
      <DialogContent className="max-w-screen-xl h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <FormatIcon className="h-4 w-4 text-muted-foreground" />
            {material.name}
          </DialogTitle>
        </DialogHeader>

        {/* Preview area */}
        <div className="flex-1 min-h-[500px] relative rounded-md overflow-hidden border bg-muted/20">
          {material.fileName && previewUrl ? <FilePreview key={material.id} url={previewUrl} name={material.fileName} /> : previewUrl ? (
            <>
              {!iframeLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Skeleton className="w-full h-full" />
                </div>
              )}
              <iframe
                src={previewUrl}
                title={`Preview: ${material.name}`}
                className="w-full h-full border-0 min-h-[500px]"
                onLoad={() => setIframeLoaded(true)}
                sandbox="allow-scripts allow-same-origin"
                allowFullScreen
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
              <div className="rounded-full bg-muted p-4">
                <AlertTriangle className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">Preview not available</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This material has no file or URL to preview.
                </p>
              </div>
              {openUrl && (
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <a
                    href={openUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Open directly
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {openUrl && (
            <Button size="sm" asChild>
              <a href={openUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Open in new tab
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

/** Get the URL to display in the iframe */
function getPreviewUrl(material: MaterialListItem): string | null {
  // VideoLink (format 4) — YouTube embed or raw URL
  if (material.materialFormat === 4 && material.url) {
    return toYouTubeEmbed(material.url) ?? material.url
  }

  // File-based materials — use GetForView endpoint
  if (material.fileName) {
    return getMaterialViewUrl(material.id, material.fileName)
  }

  // URL fallback (non-video)
  if (material.url) {
    return material.url
  }

  return null
}

/** Get the URL for "Open in new tab" button */
function getOpenUrl(material: MaterialListItem): string | null {
  if (material.url) return material.url
  if (material.fileName) {
    return getMaterialViewUrl(material.id, material.fileName)
  }
  return null
}
