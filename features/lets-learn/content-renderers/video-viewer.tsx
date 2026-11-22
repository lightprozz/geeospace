'use client'
// ---------------------------------------------------------------------------
// Video Viewer — dark player with controls or play button placeholder
// ---------------------------------------------------------------------------

import { PlayCircle } from 'lucide-react'
import type { LessonUnitMaterial } from '@/features/lms/types/lets-learn'

interface VideoViewerProps {
  material: LessonUnitMaterial | null
  title: string
}

export function VideoViewer({ material, title }: VideoViewerProps) {
  // If we have a URL, render actual video player
  if (material?.url) {
    return (
      <div className="w-full h-full max-w-7xl bg-black rounded-xl shadow-lg border border-border flex flex-col items-center justify-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <video
          src={material.url}
          controls
          className="w-full h-full object-contain"
          preload="metadata"
        >
          <track kind="captions" />
          Your browser does not support the video tag.
        </video>
      </div>
    )
  }

  // Placeholder — matches mockup design
  return (
    <div className="w-full h-full max-w-7xl bg-black rounded-xl shadow-lg border border-border flex flex-col items-center justify-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      <PlayCircle className="w-20 h-20 text-white/80 hover:text-white cursor-pointer hover:scale-110 transition-all z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
        <span className="text-white font-medium text-lg">{title}</span>
      </div>
      {/* Mock timeline bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
        <div className="h-full bg-primary w-1/3" />
      </div>
    </div>
  )
}
