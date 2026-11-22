'use client'
// ---------------------------------------------------------------------------
// URL Viewer — external content card with "Open" button
// ---------------------------------------------------------------------------

import { LinkIcon } from 'lucide-react'
import type { LessonUnitMaterial } from '@/features/lms/types/lets-learn'

interface UrlViewerProps {
  material: LessonUnitMaterial
  title: string
}

export function UrlViewer({ material, title }: UrlViewerProps) {
  return (
    <div className="w-full h-full max-w-7xl bg-card rounded-xl shadow-lg border border-border flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="w-full h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <LinkIcon className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            {title || 'External Content'}
          </h3>
          <p className="text-muted-foreground text-sm">
            This lesson contains external interactive content. Click the button
            below to open it in a new tab.
          </p>
        </div>
        {material.url ? (
          <a
            href={material.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium shadow-sm hover:bg-primary/90 transition-colors inline-block"
          >
            Open Interactive Content
          </a>
        ) : (
          <p className="text-muted-foreground/60 text-xs">
            No URL provided for this resource
          </p>
        )}
      </div>
    </div>
  )
}
