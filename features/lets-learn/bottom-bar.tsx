'use client'
// ---------------------------------------------------------------------------
// Bottom Bar — navigation (Back / Next / End Session) + title hierarchy
// Title shows: procedures • description • teacherActivities (rich text)
// Timer has been moved to TimelineBar (top-left)
// ---------------------------------------------------------------------------

import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import type { LessonUnit } from '@/features/lms/types/lets-learn'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BottomBarProps {
  currentUnit: LessonUnit | undefined
  isEndScreen: boolean
  /** Total session elapsed seconds (for end screen only) */
  totalSeconds: number
  onBack: () => void
  onNext: () => void
  onEndSession: () => void
  canGoBack: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Strip HTML tags for plain text display */
function stripHtml(html: string): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').trim()
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BottomBar({
  currentUnit,
  isEndScreen,
  totalSeconds,
  onBack,
  onNext,
  onEndSession,
  canGoBack,
}: BottomBarProps) {
  // Title parts
  const procedures = currentUnit?.procedures || ''
  const description = currentUnit?.description || ''
  const teacherActivitiesRaw = currentUnit?.teacherActivities || ''
  const teacherActivities = stripHtml(teacherActivitiesRaw)

  return (
    <div className="h-14 border-t border-border bg-card px-4 md:px-8 flex items-center justify-between shrink-0 shadow-[0_-2px_3px_-1px_rgb(0,0,0,0.05)] z-10">
      {/* Left: Back button */}
      <div className="w-[100px] sm:w-[130px] shrink-0">
        <button
          aria-label="Back"
          onClick={onBack}
          disabled={!canGoBack}
          className="w-full h-9 rounded-md text-sm font-medium border border-input bg-background hover:bg-muted text-foreground transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">BACK</span>
        </button>
      </div>

      {/* Center: Title hierarchy */}
      <div className="flex-1 flex flex-col items-center justify-center px-3 overflow-hidden min-w-0">
        {!isEndScreen ? (
          <>
            {/* Title: procedures • description */}
            <div className="flex items-center gap-1.5 w-full justify-center min-w-0">
              {procedures && (
                <span className="font-bold text-foreground text-xs sm:text-sm truncate max-w-[40%]">
                  {procedures}
                </span>
              )}
              {procedures && description && (
                <span className="text-muted-foreground text-[10px] shrink-0">•</span>
              )}
              {description && (
                <span className="text-muted-foreground text-xs truncate max-w-[40%]">
                  {description}
                </span>
              )}
            </div>

            {/* Subtext: teacherActivities */}
            {teacherActivities && (
              <span className="text-muted-foreground/60 text-[10px] truncate w-full text-center italic leading-tight">
                {teacherActivities}
              </span>
            )}
          </>
        ) : (
          <div className="flex items-center gap-1.5 text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full border border-border/50">
            <Clock className="w-3 h-3" />
            <span className="text-[11px] font-medium font-mono">
              Session: {formatTime(totalSeconds)}
            </span>
          </div>
        )}
      </div>

      {/* Right: Next / End Session button */}
      <div className="w-[100px] sm:w-[130px] shrink-0">
        {isEndScreen ? (
          <button
            onClick={onEndSession}
            className="w-full h-9 rounded-md font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-md hover:shadow-lg focus:ring-2 ring-offset-2 ring-emerald-500 uppercase text-xs sm:text-sm tracking-wide"
          >
            End Session
          </button>
        ) : (
          <button
            aria-label="Next"
            onClick={onNext}
            className="w-full h-9 rounded-md font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 uppercase text-xs sm:text-sm tracking-wide"
          >
            <span className="hidden sm:inline">NEXT</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
