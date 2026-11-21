'use client'
// ---------------------------------------------------------------------------
// app/(lets-learn)/lets-learn/[id]/_components/lets-learn-client.tsx
// Main orchestrator for the Let's Learn lesson presentation
// Manages: data fetch, timer interval, step state, component composition
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react'
import { useWindowNavigation } from '@/components/desktop/window-navigation'
import { Loader2 } from 'lucide-react'

import { useLetsLearnUnits } from '@/features/lms/hooks/lets-learn/use-lets-learn-units'
import { useLetsLearnStore } from '@/features/lms/stores/use-lets-learn-store'
import { resolveContentType } from '@/features/lms/types/lets-learn'
import type { LetsLearnSource } from '@/features/lms/types/lets-learn'
import { TimelineBar } from './timeline-bar'
import { BottomBar } from './bottom-bar'
import { EndScreen } from './end-screen'
import { ContentRenderer } from './content-renderer'
import { StudentRosterDialog } from './student-roster-dialog'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LetsLearnClientProps {
  id: string
  isPreview: boolean
  source: LetsLearnSource
  classId?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LetsLearnClient({
  id,
  isPreview,
  source,
  classId,
}: LetsLearnClientProps) {
  const { navigate } = useWindowNavigation()
  const { data: units, isLoading, error } = useLetsLearnUnits(id, source)
  const store = useLetsLearnStore()
  const initializedRef = useRef(false)

  // Student Roster Dialog state
  const [isRosterOpen, setIsRosterOpen] = useState(false)

  // Show roster button only when classId is available
  // (classLesson source always has classId; lessonPlan/curriculum source does not)
  const showRosterButton = !!classId

  // Initialize session when units arrive
  useEffect(() => {
    if (units && units.length > 0 && !initializedRef.current) {
      store.initSession(units.length)
      initializedRef.current = true
    }
    return () => {
      initializedRef.current = false
      store.resetSession()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units])

  // Timer — uses Date.now() delta so it counts accurately even when tab is backgrounded
  // Browsers throttle setInterval in background tabs, so we store the last tick timestamp
  // and compute elapsed delta on each tick.
  useEffect(() => {
    let lastTick = Date.now()

    const tick = () => {
      if (!initializedRef.current) { lastTick = Date.now(); return }
      const now = Date.now()
      const elapsed = Math.floor((now - lastTick) / 1000)
      if (elapsed >= 1) {
        // Tick N seconds at once (catches up after background tab throttling)
        for (let i = 0; i < elapsed; i++) {
          useLetsLearnStore.getState().tick()
        }
        lastTick = now
      }
    }

    const intervalId = setInterval(tick, 250) // Check 4x/sec for smoother catch-up

    // Also tick immediately when tab regains focus
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        tick()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  const handleEndSession = () => navigate('')

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-destructive font-medium text-center">
          {error instanceof Error ? error.message : 'Failed to load lesson'}
        </p>
        <button
          onClick={handleEndSession}
          className="h-10 px-6 rounded-md font-medium border border-input bg-background hover:bg-muted text-foreground transition-colors"
        >
          Go Back
        </button>
      </div>
    )
  }

  // ── Empty state ──
  if (!units || units.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-muted-foreground font-medium text-center">
          No lesson content available
        </p>
        <button
          onClick={handleEndSession}
          className="h-10 px-6 rounded-md font-medium border border-input bg-background hover:bg-muted text-foreground transition-colors"
        >
          Go Back
        </button>
      </div>
    )
  }

  const currentUnit = units[store.activeStep]
  const contentType = currentUnit ? resolveContentType(currentUnit) : 'unknown'

  return (
    <>
      {/* 1. Timeline Bar (top) */}
      <TimelineBar
        units={units}
        activeStep={store.activeStep}
        isEndScreen={store.isEndScreen}
        showRosterButton={showRosterButton}
        durations={store.durations}
        totalSeconds={store.totalSeconds}
        onStepClick={store.goToStep}
        onOpenRoster={() => setIsRosterOpen(true)}
      />

      {/* 2. Content Area (middle — flex-1) */}
      <div className="flex-1 overflow-auto bg-muted/10 relative flex flex-col min-h-0">
        {store.isEndScreen ? (
          <EndScreen />
        ) : currentUnit ? (
          <div className="flex-1 w-full h-full p-4 lg:p-8 flex justify-center items-start overflow-y-auto">
            <ContentRenderer unit={currentUnit} contentType={contentType} />
          </div>
        ) : null}
      </div>

      {/* 3. Bottom Bar (bottom) */}
      <BottomBar
        currentUnit={currentUnit}
        isEndScreen={store.isEndScreen}
        totalSeconds={store.totalSeconds}
        onBack={store.back}
        onNext={store.next}
        onEndSession={handleEndSession}
        canGoBack={store.activeStep > 0 || store.isEndScreen}
      />

      {/* 4. Student Roster Dialog (overlay) — only when classId available */}
      {classId && (
        <StudentRosterDialog
          isOpen={isRosterOpen}
          onClose={() => setIsRosterOpen(false)}
          isPreview={isPreview}
          classId={classId}
        />
      )}
    </>
  )
}
