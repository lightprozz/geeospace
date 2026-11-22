'use client'
// ---------------------------------------------------------------------------
// Content Renderer — routes to the correct viewer based on content type
// ---------------------------------------------------------------------------

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import type { LessonUnit, UnitContentType } from '@/features/lms/types/lets-learn'
import { VideoViewer } from './content-renderers/video-viewer'
import { ImageViewer } from './content-renderers/image-viewer'
import { UrlViewer } from './content-renderers/url-viewer'

// Dynamic import for PdfViewer — heavy dependency, no SSR
const PdfViewer = dynamic(
  () =>
    import('./content-renderers/pdf-viewer').then((mod) => mod.PdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  },
)

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ContentRendererProps {
  unit: LessonUnit
  contentType: UnitContentType
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContentRenderer({ unit, contentType }: ContentRendererProps) {
  const material = unit.material
  const title = unit.procedures || unit.description || 'Untitled'

  switch (contentType) {
    case 'pdf':
      return material ? (
        <PdfViewer material={material} title={title} />
      ) : (
        <FallbackViewer title={title} />
      )
    case 'video':
      return <VideoViewer material={material} title={title} />
    case 'image':
      return <ImageViewer material={material} title={title} />
    case 'url':
      return material ? (
        <UrlViewer material={material} title={title} />
      ) : (
        <FallbackViewer title={title} />
      )
    default:
      return <FallbackViewer title={title} description={unit.description} />
  }
}

// ---------------------------------------------------------------------------
// Fallback for unknown / null material
// ---------------------------------------------------------------------------

function FallbackViewer({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="w-full h-full max-w-7xl bg-card rounded-xl shadow-lg border border-border flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="text-center space-y-4 max-w-md">
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
        <p className="text-muted-foreground/60 text-xs">
          No digital resource attached to this unit
        </p>
      </div>
    </div>
  )
}
