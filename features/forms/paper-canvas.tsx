'use client'
// ---------------------------------------------------------------------------
// _components/paper-canvas.tsx
// Shared "paper-on-dotted-canvas" wrapper used by the Form Template builder
// (Phase 1 center column) and the Request Submit page (Phase 5).
// ---------------------------------------------------------------------------

import * as React from 'react'
import { cn } from '@/lib/utils'

interface PaperCanvasProps {
  title?: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}

/**
 * Outer container with the dotted background, holding a centered rounded
 * "paper" card. The dots are absolutely positioned at 20px grid spacing
 * and use `pointer-events-none` so they do not block clicks.
 */
export function PaperCanvas({
  title,
  subtitle,
  children,
  className,
}: PaperCanvasProps) {
  return (
    <div
      className={cn(
        'relative min-h-[420px] rounded-2xl border border-border/60 bg-muted/20 px-4 py-8',
        className,
      )}
    >
      {/* Dotted background grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-40 bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:20px_20px] dark:bg-[radial-gradient(#333_1px,transparent_1px)]"
      />

      <div className="relative z-10 mx-auto w-full max-w-2xl space-y-6">
        {/* Header */}
        {(title || subtitle) && (
          <header className="space-y-2 text-center">
            {title && (
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-base text-muted-foreground">{subtitle}</p>
            )}
          </header>
        )}

        {/* Paper card */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          {children}
        </div>
      </div>
    </div>
  )
}
