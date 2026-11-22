'use client'
// ---------------------------------------------------------------------------
// Image Viewer — displays image or dashed border placeholder
// ---------------------------------------------------------------------------

import { useState } from 'react'
import { ImageIcon } from 'lucide-react'
import type { LessonUnitMaterial } from '@/features/lms/types/lets-learn'

interface ImageViewerProps {
  material: LessonUnitMaterial | null
  title: string
}

export function ImageViewer({ material, title }: ImageViewerProps) {
  const [hasError, setHasError] = useState(false)

  // Show image if URL exists and hasn't errored
  if (material?.url && !hasError) {
    return (
      <div className="w-full h-full max-w-7xl bg-card rounded-xl shadow-lg border border-border flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95 duration-300">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={material.url}
          alt={title}
          className="max-w-full max-h-full object-contain rounded-lg"
          loading="lazy"
          onError={() => setHasError(true)}
        />
      </div>
    )
  }

  // Dashed border placeholder — matches mockup
  return (
    <div className="w-full h-full max-w-7xl bg-card rounded-xl shadow-lg border border-border flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="w-full h-full border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center text-muted-foreground bg-muted/10">
        <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
        <span className="font-medium">Image Resource View</span>
      </div>
    </div>
  )
}
