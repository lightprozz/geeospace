'use client'
// ---------------------------------------------------------------------------
// StudentRosterDialog — full-screen modal for classroom interaction tools
// Composed from: student-grid, toolkit-overlays, bottom-toolbar
// Mode-aware: isPreview hides Teacher Worklog tab + Attendance
// ---------------------------------------------------------------------------

import { useState, useCallback, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X,
  LayoutGrid,
  CheckCircle,
  Award,
  Shuffle,
  AlarmClock,
  Loader2,
} from 'lucide-react'

import { useClassStudents } from '@/features/lms/hooks/classes/use-classes'
import {
  StudentGrid,
  toRosterStudents,
  AVAILABLE_BADGES,
  type RosterStudent,
} from './student-roster/student-grid'
import {
  ToolkitGrid,
  renderToolOverlay,
  type ToolType,
} from './student-roster/toolkit-overlays'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StudentRosterDialogProps {
  isOpen: boolean
  onClose: () => void
  isPreview: boolean
  classId: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StudentRosterDialog({
  isOpen,
  onClose,
  isPreview,
  classId,
}: StudentRosterDialogProps) {
  // ── Data ────────────────────────────────────────────────────────────────
  const { data: apiStudents, isLoading, error } = useClassStudents(classId)

  const rosterStudents: RosterStudent[] = useMemo(
    () => (apiStudents ? toRosterStudents(apiStudents) : []),
    [apiStudents],
  )

  // ── UI State ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'students' | 'worklog'>('students')
  const [activeTool, setActiveTool] = useState<ToolType>('none')
  const [isBadgeMode, setIsBadgeMode] = useState(false)

  // Badge state (local only — per session)
  const [studentBadges, setStudentBadges] = useState<Record<string, string[]>>({})

  // Random picker state
  const [randomlySelected, setRandomlySelected] = useState<string | null>(null)
  const [isRandomizing, setIsRandomizing] = useState(false)

  // ── Badge handlers ──────────────────────────────────────────────────────
  const handleBadgeDrop = useCallback(
    (studentId: string, badgeId: string) => {
      setStudentBadges((prev) => {
        const next = { ...prev }
        if (studentId === 's0') {
          // Whole class
          rosterStudents.forEach((s) => {
            if (!s.isClassEntry) {
              next[s.id] = [...(next[s.id] || []), badgeId]
            }
          })
        } else {
          next[studentId] = [...(next[studentId] || []), badgeId]
        }
        return next
      })
    },
    [rosterStudents],
  )

  const handleDragStart = (e: React.DragEvent, badgeId: string) => {
    e.dataTransfer.setData('badgeId', badgeId)
  }

  // ── Random picker ──────────────────────────────────────────────────────
  const handleRandomize = useCallback(() => {
    setIsBadgeMode(false)
    setActiveTool('none')
    const validStudents = rosterStudents.filter((s) => !s.isClassEntry)
    if (validStudents.length === 0) return
    setIsRandomizing(true)
    setRandomlySelected(null)

    let count = 0
    const int = setInterval(() => {
      setRandomlySelected(
        validStudents[Math.floor(Math.random() * validStudents.length)].id,
      )
      count++
      if (count > 25) {
        clearInterval(int)
        setIsRandomizing(false)
      }
    }, 100)
  }, [rosterStudents])

  // ── Tool helpers ───────────────────────────────────────────────────────
  const closeTool = () => setActiveTool('none')
  const selectTool = (tool: ToolType) => {
    setIsBadgeMode(false)
    setActiveTool(tool)
  }
  const toggleBadgeMode = () => {
    setIsBadgeMode(!isBadgeMode)
    setActiveTool('none')
  }

  const studentsForGroups = useMemo(
    () => rosterStudents.map((s) => ({ id: s.id, name: s.name })),
    [rosterStudents],
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <div role="dialog" aria-label="Student roster" aria-modal="true" className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-6xl h-full min-h-0 bg-background border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden"
          >
            {/* ── Header & Tabs ───────────────────────────────────── */}
            <div className="flex flex-col bg-card border-b border-border shrink-0 z-20 relative">
              <div className="flex items-center justify-center relative p-4 pb-0">
                <div className="flex space-x-8 px-4">
                  {/* Students Tab — always visible */}
                  <button
                    onClick={() => setActiveTab('students')}
                    className={`pb-4 font-bold text-[15px] transition-colors relative ${
                      activeTab === 'students'
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Students
                    {activeTab === 'students' && (
                      <motion.div
                        layoutId="roster-tab"
                        className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full"
                      />
                    )}
                  </button>

                  {/* Teacher Worklog Tab — HIDDEN in preview mode */}
                  {!isPreview && (
                    <button
                      onClick={() => setActiveTab('worklog')}
                      className={`pb-4 font-bold text-[15px] transition-colors relative ${
                        activeTab === 'worklog'
                          ? 'text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Teacher Worklog
                      {activeTab === 'worklog' && (
                        <motion.div
                          layoutId="roster-tab"
                          className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full"
                        />
                      )}
                    </button>
                  )}
                </div>

                {/* Close button */}
                <button
                  aria-label="Close roster"
                  onClick={onClose}
                  className="absolute right-4 mb-4 p-2 pl-3 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* ── Main Area ───────────────────────────────────────── */}
            <div data-tool-area className="flex min-h-0 flex-col flex-1 relative overflow-hidden">
              {/* Tool Overlays */}
              {activeTool === 'toolkit' && (
                <ToolkitGrid
                  onClose={closeTool}
                  onSelectTool={selectTool}
                  onRandomize={handleRandomize}
                />
              )}
              {renderToolOverlay(activeTool, closeTool, studentsForGroups)}

              {/* Random result click-to-dismiss */}
              {randomlySelected && !isRandomizing && (
                <div
                  className="absolute inset-0 z-40 cursor-pointer"
                  onClick={() => setRandomlySelected(null)}
                />
              )}

              {/* Badge Mode Draggable Icons Panel */}
              <AnimatePresence>
                {isBadgeMode && activeTab === 'students' && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40"
                  >
                    <div className="bg-card border border-border shadow-2xl px-6 py-4 rounded-[1.25rem] flex items-center gap-6">
                      <div className="flex flex-col">
                          <span className="font-bold text-base text-foreground">
                          Rewards
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Drag & drop badges onto students
                        </span>
                      </div>
                      <div className="flex gap-3">
                        {AVAILABLE_BADGES.map((b) => {
                          const Icon = b.icon
                          return (
                            <div
                              key={b.id}
                              draggable
                              onDragStart={(e: React.DragEvent) => handleDragStart(e, b.id)}
                              className={`w-12 h-12 rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center border-border border shadow-sm hover:scale-110 transition-transform ${b.colorBg}`}
                            >
                              <Icon className={`w-6 h-6 ${b.colorText}`} />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Scrollable Body */}
              <div className="min-h-0 flex-1 overflow-y-auto p-6 md:p-8 relative z-10 w-full">
                {error ? <p role="alert">Unable to load students. Close the roster and try again later.</p> : isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : activeTab === 'students' ? (
                  <StudentGrid
                    students={rosterStudents}
                    isBadgeMode={isBadgeMode}
                    randomlySelected={randomlySelected}
                    isRandomizing={isRandomizing}
                    studentBadges={studentBadges}
                    onBadgeDrop={handleBadgeDrop}
                  />
                ) : (
                  /* Teacher Worklog tab — placeholder for live mode */
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                    <p className="text-sm font-medium">Teacher Worklog</p>
                    <p className="text-xs text-muted-foreground/60">
                      Coming soon — live mode feature
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Bottom Toolbar ────────────────────────────────── */}
            <div
              className={`h-20 bg-card border-t border-border px-3 flex items-center justify-between gap-3 shrink-0 overflow-x-auto no-scrollbar relative z-20 transition-all ${
                activeTab === 'worklog'
                  ? 'opacity-30 pointer-events-none grayscale'
                  : 'opacity-100'
              }`}
            >
              {/* Toolkit */}
              <button
                onClick={() =>
                  selectTool(activeTool === 'toolkit' ? 'none' : 'toolkit')
                }
                className={`flex items-center gap-3 transition-colors whitespace-nowrap p-2 rounded-xl hover:bg-muted ${
                  activeTool === 'toolkit'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutGrid className="w-6 h-6" />
                <span className="font-bold text-[15px]">Toolkit</span>
              </button>

              <div className="w-px h-8 bg-border" />

              {/* Attendance — HIDDEN in preview mode */}
              {!isPreview && (
                <>
                  <button
                    className="flex items-center gap-3 transition-colors whitespace-nowrap p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <CheckCircle className="w-6 h-6" />
                    <span className="font-bold text-[15px]">Attendance</span>
                  </button>
                </>
              )}

              {/* Badge */}
              <button
                onClick={toggleBadgeMode}
                className={`flex items-center gap-3 transition-colors whitespace-nowrap p-2 rounded-xl hover:bg-muted ${
                  isBadgeMode
                    ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Award className="w-6 h-6" />
                <span className="font-bold text-[15px]">Badges</span>
              </button>

              {/* Random */}
              <button
                onClick={handleRandomize}
                disabled={isRandomizing}
                className="flex items-center gap-3 transition-colors whitespace-nowrap p-2 rounded-xl text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-50"
              >
                <Shuffle className={`w-6 h-6 ${isRandomizing ? 'animate-spin' : ''}`} />
                <span className="font-bold text-[15px]">Random</span>
              </button>

              {/* Timer shortcut */}
              <button
                onClick={() => selectTool('timer')}
                className={`flex items-center gap-3 transition-colors whitespace-nowrap p-2 rounded-xl hover:bg-muted ${
                  activeTool === 'timer'
                    ? 'text-violet-500 bg-violet-500/10'
                    : 'text-muted-foreground hover:text-foreground hover:text-violet-500'
                }`}
              >
                <AlarmClock className="w-6 h-6" />
                <span className="font-bold text-[15px]">Timer</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
