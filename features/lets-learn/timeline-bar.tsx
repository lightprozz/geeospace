'use client'
// ---------------------------------------------------------------------------
// Timeline Bar — horizontal step progress (top of screen)
// Includes: per-unit timer (left) + step dots (center) + roster button (right)
// ---------------------------------------------------------------------------

import { useRef, useEffect } from 'react'
import { Check, Clock, AlertTriangle } from 'lucide-react'
import type { LessonUnit } from '@/features/lms/types/lets-learn'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TimelineBarProps {
  units: LessonUnit[]
  activeStep: number
  isEndScreen: boolean
  /** Show student roster button (true when classId is available) */
  showRosterButton: boolean
  /** Per-unit durations from store */
  durations: number[]
  /** Total session time */
  totalSeconds: number
  onStepClick: (index: number) => void
  onOpenRoster?: () => void
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

function parseTimeBudget(time: string | undefined): number {
  if (!time) return 0
  const parsed = parseFloat(time)
  return isNaN(parsed) ? 0 : Math.round(parsed * 60)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TimelineBar({
  units,
  activeStep,
  isEndScreen,
  showRosterButton,
  durations,
  totalSeconds,
  onStepClick,
  onOpenRoster,
}: TimelineBarProps) {
  // Auto-scroll active step into view
  const stepRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    const activeEl = stepRefs.current[activeStep]
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      })
    }
  }, [activeStep])

  // Timer data
  const currentUnit = units[activeStep]
  const unitElapsed = durations[activeStep] ?? 0
  const unitBudget = parseTimeBudget(currentUnit?.time)
  const isOverBudget = unitBudget > 0 && unitElapsed > unitBudget

  return (
    <div className="w-full px-4 sm:px-8 py-1.5 md:py-2 bg-card border-b border-border grid grid-cols-6 items-center shrink-0 shadow-sm gap-3">
      {/* Left: Timer — 1/6 */}
      <div className="col-span-1 flex items-center gap-2">
        {/* Per-unit timer */}
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] sm:text-[11px] font-mono font-medium transition-colors ${isOverBudget
            ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400'
            : 'bg-muted border-border/50 text-muted-foreground'
            }`}
        >
          {isOverBudget && <AlertTriangle className="w-2.5 h-2.5 shrink-0" />}
          <Clock className="w-2.5 h-2.5 shrink-0" />
          <span className="tabular-nums whitespace-nowrap">
            {formatTime(unitElapsed)}
            {unitBudget > 0 && (
              <span className={isOverBudget ? 'text-amber-500/60' : 'text-muted-foreground/40'}>
                /{formatTime(unitBudget)}
              </span>
            )}
          </span>
        </div>
        {/* Total session */}
        <span className="text-[9px] font-mono text-muted-foreground/40 tabular-nums hidden sm:inline">
          Σ{formatTime(totalSeconds)}
        </span>
      </div>

      {/* Center: Steps — 4/6 */}
      <div className="col-span-4 flex items-center overflow-x-auto no-scrollbar scroll-smooth justify-center">
        {units.map((unit, idx) => {
          const isCompleted = isEndScreen || idx < activeStep
          const isActive = !isEndScreen && idx === activeStep
          const isClickable = idx <= activeStep || isEndScreen

          return (
            // Use unitId (stable per unit across sessions) rather than unit.id, which the
            // V2 /units endpoint does not return and would cause React's missing-key warning.
            <div key={unit.unitId} className="flex items-center flex-1 last:flex-none">
              {/* Circle */}
              <button
                ref={(el) => {
                  stepRefs.current[idx] = el
                }}
                onClick={() => {
                  if (isClickable) onStepClick(idx)
                }}
                disabled={!isClickable}
                className={`flex items-center justify-center w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full border-2 text-[6px] sm:text-[8px] font-bold shrink-0 transition-all duration-300 ${isCompleted
                  ? 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600'
                  : isActive
                    ? 'bg-destructive border-destructive text-destructive-foreground shadow-md scale-110'
                    : 'bg-muted border-muted-foreground/30 text-muted-foreground'
                  }`}
                aria-label={`Step ${idx + 1}${isCompleted ? ' (completed)' : isActive ? ' (current)' : ''}`}
              >
                {isCompleted ? (
                  <Check className="w-1.5 h-1.5 sm:w-2 sm:h-2" />
                ) : (
                  ''
                )}
              </button>

              {/* Connecting line */}
              {idx < units.length - 1 && (
                <div className="flex-1 px-1 sm:px-2 min-w-[20px]">
                  <div
                    className={`h-[2px] w-full rounded-full transition-colors duration-300 ${isCompleted ? 'bg-emerald-500' : 'bg-border'
                      }`}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Right: Student avatars button — 1/6 */}
      <div className="col-span-1 flex items-center justify-end">
        {showRosterButton && (
          <button
            type="button"
            aria-label="Open student roster"
            onClick={onOpenRoster}
            className="flex items-center gap-2 h-7 px-2.5 rounded-md bg-secondary/50 text-secondary-foreground hover:bg-secondary border border-border shadow-sm transition-all"
          >
            <div className="flex -space-x-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://api.dicebear.com/9.x/bottts/svg?seed=bill"
                className="w-4 h-4 rounded-full border border-card bg-muted"
                alt="Student"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://api.dicebear.com/9.x/bottts/svg?seed=mia"
                className="w-4 h-4 rounded-full border border-card bg-muted"
                alt="Student"
              />
              <div className="w-4 h-4 rounded-full border border-card bg-background flex items-center justify-center text-[7px] font-bold text-muted-foreground">
                +8
              </div>
            </div>
            <span className="text-[10px] font-semibold hidden sm:block">
              Class
            </span>
        </button>
        )}
      </div>
    </div>
  )
}
