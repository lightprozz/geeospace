'use client'
// ---------------------------------------------------------------------------
// Toolkit Overlays — Timer, NoiseMeter, Groups, Directions, ThinkPairShare,
// Today, Music tool overlay components for StudentRosterDialog
// Ported from mockup: StudentRosterModal.tsx lines 110–545
// ---------------------------------------------------------------------------

import { useState, useEffect, useReducer } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ChevronUp,
  ChevronDown,
  Play,
  Pause,
  RotateCcw,
  Users,
  Shuffle,
  Music,
  Sun,
  MessageCircle,
  ListOrdered,
  AlarmClock,
  BarChart2,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToolType =
  | 'none'
  | 'toolkit'
  | 'timer'
  | 'noise'
  | 'groups'
  | 'directions'
  | 'thinkPairShare'
  | 'today'
  | 'music'

interface OverlayCloseProps {
  onClose: () => void
}

interface StudentForGroup {
  id: string
  name: string
  seed: string
}

// ---------------------------------------------------------------------------
// Close button (shared)
// ---------------------------------------------------------------------------

function OverlayCloseButton({ onClose }: OverlayCloseProps) {
  return (
    <button
      aria-label="Close tool"
      onClick={onClose}
      className="absolute top-6 right-6 p-2 bg-muted rounded-full hover:bg-muted-foreground/20 text-foreground transition-colors z-50"
    >
      <X className="w-6 h-6" />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Timer Tool
// ---------------------------------------------------------------------------

export function TimerTool({ onClose }: OverlayCloseProps) {
  const [seconds, setSeconds] = useState(300)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    if (!isActive || seconds <= 0) return
    const interval = setInterval(() => setSeconds((s) => s - 1), 1000)
    return () => clearInterval(interval)
  }, [isActive, seconds])

  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 bg-background/95 z-40 flex flex-col items-center justify-center p-6 backdrop-blur-md rounded-2xl"
    >
      <OverlayCloseButton onClose={onClose} />
      <h3 className="text-2xl font-bold text-muted-foreground mb-8">
        Timer
      </h3>
      <div className="flex flex-col items-center mb-12">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <button
              onClick={() => setSeconds((v) => v + 60)}
              disabled={isActive}
              className="p-2 hover:bg-muted rounded-full transition-colors mb-2 disabled:opacity-30"
            >
              <ChevronUp className="w-12 h-12 text-muted-foreground" />
            </button>
            <div className="text-[8rem] font-mono font-bold leading-none tabular-nums text-foreground tracking-tight">
              {m}
            </div>
            <button
              onClick={() => setSeconds((v) => Math.max(0, v - 60))}
              disabled={isActive}
              className="p-2 hover:bg-muted rounded-full transition-colors mt-2 disabled:opacity-30"
            >
              <ChevronDown className="w-12 h-12 text-muted-foreground" />
            </button>
          </div>
          <div className="text-[8rem] font-mono font-bold leading-none tabular-nums text-foreground tracking-tight pb-12">
            :
          </div>
          <div className="flex flex-col items-center">
            <div className="p-2 mb-2 invisible"><ChevronUp className="w-12 h-12" /></div>
            <div className="text-[8rem] font-mono font-bold leading-none tabular-nums text-foreground tracking-tight">
              {s}
            </div>
            <div className="p-2 mt-2 invisible"><ChevronDown className="w-12 h-12" /></div>
          </div>
        </div>
      </div>
      <div className="flex gap-6">
        <button
          className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
          onClick={() => { setIsActive(false); setSeconds(300) }}
        >
          <RotateCcw className="w-6 h-6" />
        </button>
        <button
          className={`w-20 h-20 rounded-full flex items-center justify-center text-white transition-all shadow-lg hover:shadow-xl ${
            isActive
              ? 'bg-amber-500 hover:bg-amber-600 scale-95'
              : 'bg-primary hover:bg-primary/90 hover:scale-105'
          }`}
          onClick={() => setIsActive(!isActive)}
        >
          {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
        </button>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Noise Meter
// ---------------------------------------------------------------------------

export function NoiseMeterTool({ onClose }: OverlayCloseProps) {
  const [volumes, setVolumes] = useState(Array(30).fill(10))

  useEffect(() => {
    const i = setInterval(() => {
      setVolumes((prev) => prev.map(() => 10 + Math.random() * 80))
    }, 100)
    return () => clearInterval(i)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 bg-background/95 z-40 flex flex-col items-center justify-center p-6 backdrop-blur-md rounded-2xl"
    >
      <OverlayCloseButton onClose={onClose} />
      <h3 className="text-2xl font-bold text-muted-foreground mb-12">
        Noise Meter (demo)
      </h3>
      <div className="flex items-end gap-2 h-64 w-full max-w-3xl px-8 border-b-2 border-border pb-4 relative">
        {volumes.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm transition-all duration-100 ease-out"
            style={{
              height: `${v}%`,
              backgroundColor: v > 80 ? '#ef4444' : v > 50 ? '#f59e0b' : '#3b82f6',
            }}
          />
        ))}
        <div className="absolute left-0 right-0 bottom-[80%] border-t-2 border-dashed border-red-500/50" />
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Group Tool
// ---------------------------------------------------------------------------

export function GroupTool({
  onClose,
  students,
}: OverlayCloseProps & { students: StudentForGroup[] }) {
  const [groupCount, setGroupCount] = useState(4)

  // Group generation via reducer — avoids purity/setState-in-effect lint
  const [groups, regenerate] = useReducer(
    (_prev: StudentForGroup[][], action: { students: StudentForGroup[]; count: number }) => {
      const validStudents = action.students.filter((s) => s.id !== 's0')
      const shuffled = [...validStudents].sort(() => 0.5 - Math.random())
      const ng = Array.from({ length: action.count }, () => [] as StudentForGroup[])
      shuffled.forEach((s, idx) => {
        ng[idx % action.count].push(s)
      })
      return ng
    },
    [] as StudentForGroup[][],
  )

  // Auto-regenerate when groupCount or students change
  useEffect(() => {
    regenerate({ students, count: groupCount })
  }, [groupCount, students])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 bg-background/95 z-40 flex flex-col p-8 backdrop-blur-md overflow-hidden rounded-2xl"
    >
      <OverlayCloseButton onClose={onClose} />
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-bold text-foreground">Group Generator</h3>
        <div className="flex items-center gap-4 bg-card border border-border p-2 rounded-xl shadow-sm mr-16">
          <span className="text-sm font-medium px-2">Groups: {groupCount}</span>
          <input type="range" min={2} max={8} value={groupCount} onChange={(e) => setGroupCount(Number(e.target.value))} className="w-32 accent-primary" />
          <button onClick={() => regenerate({ students, count: groupCount })} className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
            <Shuffle className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-2 md:grid-cols-4 gap-6 content-start pb-10">
        {groups.map((g, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-full text-center py-2 bg-muted rounded-xl text-sm font-bold text-muted-foreground uppercase tracking-wider">
              Group {i + 1}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {g.map((s) => (
                <div key={s.id} className="relative group/stu">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.dicebear.com/9.x/bottts/svg?seed=${s.seed}&backgroundColor=transparent`}
                    alt={s.name}
                    className="w-14 h-14 rounded-full border-2 border-border shadow-sm group-hover/stu:scale-110 transition-transform bg-white/50"
                  />
                  <div className="absolute -bottom-2 -left-2 -right-2 text-center bg-card text-[10px] font-bold rounded shadow-sm border border-border truncate px-1 py-0.5">
                    {s.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Directions Tool
// ---------------------------------------------------------------------------

export function DirectionsTool({ onClose }: OverlayCloseProps) {
  const steps = ['Open textbook to page 10', 'Review the new vocabulary', 'Complete exercises 1 and 2']

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 bg-background/95 z-40 flex flex-col items-center justify-center p-6 backdrop-blur-md rounded-2xl"
    >
      <OverlayCloseButton onClose={onClose} />
      <h3 className="text-3xl font-bold text-foreground mb-12">Directions</h3>
      <div className="w-full max-w-3xl space-y-4">
        {steps.map((st, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-6 p-6 bg-card border border-border rounded-2xl shadow-sm text-2xl font-medium"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl shrink-0">
              {i + 1}
            </div>
            {st}
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Think Pair Share
// ---------------------------------------------------------------------------

export function ThinkPairShareTool({ onClose }: OverlayCloseProps) {
  const stages = ['Think Individually', 'Pair Up & Discuss', 'Share with Class']
  const [stage, setStage] = useState(0)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 bg-background/95 z-40 flex flex-col items-center justify-center p-6 backdrop-blur-md rounded-2xl"
    >
      <OverlayCloseButton onClose={onClose} />
      <h3 className="text-2xl font-bold text-muted-foreground mb-16">
        Think - Pair - Share
      </h3>
      <div className="flex items-center justify-center gap-10 mb-16">
        {stages.map((st, i) => (
          <div
            key={i}
            className={`flex flex-col items-center gap-6 transition-all duration-500 ${stage === i ? 'scale-110 opacity-100' : 'scale-90 opacity-40 grayscale'}`}
          >
            <div className={`w-36 h-36 rounded-[2rem] flex items-center justify-center shadow-lg text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-blue-500' : 'bg-emerald-500'}`}>
              {i === 0 ? <Sun className="w-16 h-16" /> : i === 1 ? <Users className="w-16 h-16" /> : <MessageCircle className="w-16 h-16" />}
            </div>
            <span className="text-xl font-bold">{st}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4">
        <button onClick={() => setStage((v) => Math.max(0, v - 1))} disabled={stage === 0} className="px-8 py-4 rounded-xl border border-border bg-card font-semibold disabled:opacity-50 text-lg transition-colors hover:bg-muted">
          Back
        </button>
        <button onClick={() => setStage((v) => Math.min(2, v + 1))} disabled={stage === 2} className="px-10 py-4 rounded-xl bg-primary text-white font-bold shadow-md hover:bg-primary/90 disabled:opacity-50 transition-colors text-lg">
          Next
        </button>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Today (Clock + Date)
// ---------------------------------------------------------------------------

export function TodayTool({ onClose }: OverlayCloseProps) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(i)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 bg-background/95 z-40 flex flex-col items-center justify-center p-6 backdrop-blur-md rounded-2xl"
    >
      <OverlayCloseButton onClose={onClose} />
      <div className="text-[8rem] font-bold text-foreground tracking-tighter leading-none mb-4 tabular-nums">
        {now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div className="text-4xl font-medium text-muted-foreground">
        {now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Music Tool
// ---------------------------------------------------------------------------

export function MusicTool({ onClose }: OverlayCloseProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 bg-background/95 z-40 flex flex-col items-center justify-center p-6 backdrop-blur-md rounded-2xl"
    >
      <OverlayCloseButton onClose={onClose} />
      <div className="relative">
        {isPlaying && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
            className="absolute inset-0 rounded-full bg-gradient-to-tr from-pink-500 to-orange-400 opacity-50 z-0"
          />
        )}
        <div
          className={`relative z-10 w-64 h-64 rounded-full flex items-center justify-center shadow-2xl mb-12 transition-all duration-1000 ${
            isPlaying
              ? 'bg-gradient-to-tr from-pink-500 to-orange-400 rotate-180 scale-105'
              : 'bg-card border-4 border-border'
          }`}
        >
          <Music className={`w-28 h-28 transition-colors ${isPlaying ? 'text-white' : 'text-muted-foreground'}`} />
        </div>
      </div>
      <button
        className="w-24 h-24 z-20 rounded-full flex items-center justify-center text-white bg-primary transition-all shadow-lg hover:shadow-xl hover:scale-105"
        onClick={() => setIsPlaying(!isPlaying)}
      >
        {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-2" />}
      </button>
      <span className="mt-8 text-xl text-muted-foreground font-medium">
        Music demo — no audio source connected. {isPlaying ? 'Animation playing' : 'Paused'}
      </span>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Toolkit Grid — entry overlay showing all tool icons
// ---------------------------------------------------------------------------

interface ToolkitGridProps {
  onClose: () => void
  onSelectTool: (tool: ToolType) => void
  onRandomize: () => void
}

function ToolkitItem({
  icon: Icon,
  label,
  color,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  color: string
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-4 group">
      <div
        className={`w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex items-center justify-center text-white shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:shadow-md ${color}`}
      >
        <Icon className="w-12 h-12" />
      </div>
      <span className="text-sm font-bold text-center leading-tight text-foreground max-w-[100px]">
        {label}
      </span>
    </button>
  )
}

export function ToolkitGrid({ onClose, onSelectTool, onRandomize }: ToolkitGridProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute inset-0 bg-background/95 z-30 flex items-center justify-center backdrop-blur-md rounded-b-2xl"
    >
      <OverlayCloseButton onClose={onClose} />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-12 gap-y-16 mt-8">
        <ToolkitItem onClick={() => onSelectTool('timer')} icon={AlarmClock} label="Timer" color="bg-violet-600" />
        <ToolkitItem onClick={() => { onClose(); onRandomize() }} icon={Shuffle} label="Random" color="bg-emerald-500" />
        <ToolkitItem onClick={() => onSelectTool('groups')} icon={Users} label="Groups" color="bg-red-500" />
        <ToolkitItem onClick={() => onSelectTool('noise')} icon={BarChart2} label="Noise Meter" color="bg-slate-800" />
        <ToolkitItem onClick={() => onSelectTool('directions')} icon={ListOrdered} label="Directions" color="bg-teal-500" />
        <ToolkitItem onClick={() => onSelectTool('thinkPairShare')} icon={MessageCircle} label="Think - Pair - Share" color="bg-blue-500" />
        <ToolkitItem onClick={() => onSelectTool('today')} icon={Sun} label="Today" color="bg-amber-400" />
        <ToolkitItem onClick={() => onSelectTool('music')} icon={Music} label="Music" color="bg-orange-500" />
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// renderToolOverlay — helper to render the active tool overlay
// ---------------------------------------------------------------------------

export function renderToolOverlay(
  activeTool: ToolType,
  onClose: () => void,
  students: StudentForGroup[],
) {
  return (
    <AnimatePresence>
      {activeTool === 'timer' && <TimerTool onClose={onClose} />}
      {activeTool === 'noise' && <NoiseMeterTool onClose={onClose} />}
      {activeTool === 'groups' && <GroupTool students={students} onClose={onClose} />}
      {activeTool === 'directions' && <DirectionsTool onClose={onClose} />}
      {activeTool === 'thinkPairShare' && <ThinkPairShareTool onClose={onClose} />}
      {activeTool === 'today' && <TodayTool onClose={onClose} />}
      {activeTool === 'music' && <MusicTool onClose={onClose} />}
    </AnimatePresence>
  )
}
