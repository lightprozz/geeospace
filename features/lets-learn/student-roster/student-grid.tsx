'use client'
// ---------------------------------------------------------------------------
// Student Grid — avatar card grid with badge/attendance overlays
// Ported from mockup: StudentRosterModal.tsx lines 1060–1240
// ---------------------------------------------------------------------------

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Star,
  Flame,
  Trophy,
  Lightbulb,
} from 'lucide-react'
import type { ClassStudentGrid } from '@/features/lms/types/class-student'

// ---------------------------------------------------------------------------
// Badge config
// ---------------------------------------------------------------------------

export const AVAILABLE_BADGES = [
  { id: 'star', icon: Star, colorText: 'text-amber-500 fill-amber-500', colorBg: 'bg-amber-100' },
  { id: 'fire', icon: Flame, colorText: 'text-orange-500 fill-orange-500', colorBg: 'bg-orange-100' },
  { id: 'trophy', icon: Trophy, colorText: 'text-yellow-600 outline-yellow-600', colorBg: 'bg-yellow-100' },
  { id: 'lightbulb', icon: Lightbulb, colorText: 'text-emerald-500 fill-emerald-500', colorBg: 'bg-emerald-100' },
] as const

// ---------------------------------------------------------------------------
// Internal student type (for the grid display)
// ---------------------------------------------------------------------------

export interface RosterStudent {
  id: string
  name: string
  seed: string
  isClassEntry?: boolean // true = "Whole Class" card
}

/** Convert API students to roster display format */
export function toRosterStudents(students: ClassStudentGrid[]): RosterStudent[] {
  const classEntry: RosterStudent = { id: 's0', name: 'Whole Class', seed: 'class', isClassEntry: true }
  const mapped: RosterStudent[] = students.map((s) => ({
    id: s.id,
    name: s.englishName || s.studentName || 'Unknown',
    seed: (s.englishName || s.studentName || 'x').toLowerCase().replace(/\s+/g, ''),
  }))
  return [classEntry, ...mapped]
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StudentGridProps {
  students: RosterStudent[]
  isBadgeMode: boolean
  randomlySelected: string | null
  isRandomizing: boolean
  studentBadges: Record<string, string[]>
  onBadgeDrop: (studentId: string, badgeId: string) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StudentGrid({
  students,
  randomlySelected,
  isRandomizing,
  studentBadges,
  onBadgeDrop,
}: StudentGridProps) {
  const [activeEffect, setActiveEffect] = useState<{ studentId: string; badgeId: string; id: number } | null>(null)
  const effectCounter = useRef(0)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, studentId: string) => {
    e.preventDefault()
    const badgeId = e.dataTransfer.getData('badgeId')
    if (!badgeId) return

    onBadgeDrop(studentId, badgeId)

    // Show effect
    effectCounter.current += 1
    const effectId = effectCounter.current
    setActiveEffect({ studentId, badgeId, id: effectId })
    setTimeout(() => {
      setActiveEffect((curr) => (curr?.id === effectId ? null : curr))
    }, 1500)
  }

  return (
    <div className="relative w-full h-full">
      {/* Badge effect overlay */}
      {activeEffect && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.5 }}
          transition={{ type: 'spring', duration: 0.8, bounce: 0.4 }}
          className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center backdrop-blur-[2px] rounded-2xl"
        >
          {(() => {
            const b = AVAILABLE_BADGES.find((x) => x.id === activeEffect.badgeId)
            if (!b) return null
            const Icon = b.icon
            return (
              <div className="relative flex flex-col items-center">
                <motion.div
                  animate={{ rotate: [0, -15, 15, -15, 15, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="flex flex-col items-center z-10"
                >
                  <Icon className={`w-64 h-64 drop-shadow-2xl ${b.colorText}`} />
                  {activeEffect.studentId === 's0' && (
                    <div className="text-5xl font-black text-white mt-8 drop-shadow-2xl uppercase tracking-widest text-center" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                      All Students!
                    </div>
                  )}
                </motion.div>
              </div>
            )
          })()}
        </motion.div>
      )}

      {/* Random picker winner overlay — light rays + bling effect */}
      {randomlySelected && !isRandomizing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 flex items-center justify-center rounded-b-2xl cursor-pointer overflow-hidden"
        >
          {/* Gradient backdrop */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-background/90 to-amber-500/20 backdrop-blur-lg" />

          {/* Spinning light rays */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="absolute w-[800px] h-[800px] rounded-full"
            style={{
              background: `conic-gradient(
                from 0deg,
                transparent 0deg,
                oklch(0.85 0.15 85 / 0.4) 15deg,
                transparent 30deg,
                transparent 45deg,
                oklch(0.75 0.2 250 / 0.3) 60deg,
                transparent 75deg,
                transparent 90deg,
                oklch(0.85 0.15 85 / 0.35) 105deg,
                transparent 120deg,
                transparent 135deg,
                oklch(0.8 0.18 300 / 0.25) 150deg,
                transparent 165deg,
                transparent 180deg,
                oklch(0.85 0.15 85 / 0.4) 195deg,
                transparent 210deg,
                transparent 225deg,
                oklch(0.75 0.2 250 / 0.3) 240deg,
                transparent 255deg,
                transparent 270deg,
                oklch(0.85 0.15 85 / 0.35) 285deg,
                transparent 300deg,
                transparent 315deg,
                oklch(0.8 0.18 300 / 0.25) 330deg,
                transparent 345deg,
                transparent 360deg
              )`,
            }}
          />

          {/* Sparkle particles */}
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-amber-400"
              style={{
                left: `${15 + (i * 7) % 70}%`,
                top: `${10 + (i * 11) % 80}%`,
                boxShadow: '0 0 8px 2px oklch(0.85 0.15 85 / 0.8)',
              }}
              animate={{
                scale: [0, 1.5, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}

          {/* Winner card */}
          <motion.div
            initial={{ scale: 0.5, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', bounce: 0.5, duration: 0.8 }}
            className="relative z-10 bg-card/95 backdrop-blur-sm p-12 rounded-[3rem] shadow-2xl flex flex-col items-center border border-border/50"
            style={{ boxShadow: '0 0 60px 10px oklch(0.75 0.15 250 / 0.15), 0 25px 50px -12px rgb(0 0 0 / 0.15)' }}
          >
            <h3 className="text-3xl font-bold text-muted-foreground mb-8">
              Selected Student:
            </h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.dicebear.com/9.x/bottts/svg?seed=${students.find((s) => s.id === randomlySelected)?.seed}&backgroundColor=transparent`}
              alt="Selected student"
              className="w-64 h-64 drop-shadow-2xl mb-8 border-8 border-primary rounded-full bg-primary/5"
            />
            <div className="text-6xl font-black text-foreground">
              {students.find((s) => s.id === randomlySelected)?.name}
            </div>
            <p className="mt-8 text-muted-foreground font-medium animate-pulse">
              Click anywhere to close
            </p>
          </motion.div>
        </motion.div>
      )}

      {/* Student card grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-x-12 gap-y-20 place-items-center pt-16 pb-12">
        {students.map((student) => {
          const isHighlighted = randomlySelected === student.id

          return (
            <button
              key={student.id}
              onDrop={(e: React.DragEvent) => handleDrop(e, student.id)}
              onDragOver={handleDragOver}
              className="group flex flex-col items-center w-full max-w-[180px] relative transition-all duration-300"
            >
              {/* Student badges display */}
              {studentBadges[student.id] && (
                <div className="absolute top-1 left-1 flex flex-col gap-1 z-10 pointer-events-none">
                  {Object.entries(
                    studentBadges[student.id].reduce(
                      (acc, curr) => {
                        acc[curr] = (acc[curr] || 0) + 1
                        return acc
                      },
                      {} as Record<string, number>,
                    ),
                  ).map(([badgeId, count]) => {
                    const b = AVAILABLE_BADGES.find((x) => x.id === badgeId)
                    if (!b) return null
                    const BIcon = b.icon
                    return (
                      <div key={badgeId} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full shadow-sm bg-white border-2 border-white text-[10px] font-bold ${b.colorText}`}>
                        <BIcon className={`w-4 h-4 ${b.colorText}`} />
                        {count > 1 && <span>{count}</span>}
                      </div>
                    )
                  })}
                </div>
              )}

              <div
                className={`relative w-40 h-40 rounded-3xl bg-card border shadow-sm flex flex-col items-center justify-end overflow-visible transition-all duration-300 ${student.isClassEntry
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border'
                  } ${isHighlighted ? 'scale-125 z-20 ring-4 ring-primary shadow-2xl bg-white' : 'group-hover:-translate-y-2 group-hover:shadow-md'}`}
              >
                {/* Avatar */}
                <div className={`absolute w-36 h-36 overflow-visible transition-all duration-300 ${isHighlighted ? '-top-16 scale-110' : '-top-12 group-hover:scale-110'}`}>
                  {student.isClassEntry ? (
                    <div className="w-full h-full relative flex items-center justify-center ml-2">
                      {students.filter((s) => !s.isClassEntry).slice(0, 3).map((s, i) => (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          key={s.id}
                          src={`https://api.dicebear.com/9.x/bottts/svg?seed=${s.seed}&backgroundColor=transparent`}
                          alt="avatar"
                          className={`w-24 h-24 absolute object-contain filter drop-shadow-md transition-all duration-300 ${i === 0 ? 'top-0 left-4 z-20 scale-110' : i === 1 ? 'bottom-2 -left-4 z-10 opacity-90' : 'bottom-2 right-4 z-0 opacity-80'
                            }`}
                        />
                      ))}
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={`https://api.dicebear.com/9.x/bottts/svg?seed=${student.seed}&backgroundColor=transparent`}
                      alt={student.name}
                      className="w-full h-full object-contain filter drop-shadow-sm"
                    />
                  )}
                </div>

                {/* Name Bar */}
                <div className="w-full py-3 bg-card rounded-b-3xl text-center z-10">
                  <span className="text-base font-bold truncate text-foreground px-2 block">
                    {student.name}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
