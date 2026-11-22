'use client'
// ---------------------------------------------------------------------------
// _components/class-overview-panel.tsx
// Left sidebar: Schedule, Progress, Teachers, Stats sections
// Layout: curriculum-style aside (border-r bg-card) — compact single-row info
// ---------------------------------------------------------------------------

import {
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  Phone,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { shortenName } from './shorten-name'
import type { ClassCourseEntity, ClassCourseInfo, ClassTeacherGrid } from '@/features/lms/types/class'

// ---------------------------------------------------------------------------
// Sparkline — inline SVG for attendance trend (mock data for now)
// ---------------------------------------------------------------------------

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 15)
  const min = 0
  const width = 200
  const height = 40

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((val - min) / (max - min)) * height
      return `${x},${y}`
    })
    .join(' ')

  const lastIdx = data.length - 1
  const lastX = (lastIdx / (data.length - 1)) * width
  const lastY = height - ((data[lastIdx] - min) / (max - min)) * height

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        points={points}
        className="text-primary"
      />
      <circle cx={lastX} cy={lastY} r="3" className="fill-primary" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ClassOverviewPanelProps {
  classEntity: ClassCourseEntity | undefined
  classInfo: ClassCourseInfo | undefined
  teachers: ClassTeacherGrid[]
  isLoading: boolean
  isPanelCollapsed: boolean
  onTogglePanel: () => void
}

// ---------------------------------------------------------------------------
// Helper — teacher initials for avatar fallback
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// ---------------------------------------------------------------------------
// InfoRow — compact single-row info display (icon + label + value)
// ---------------------------------------------------------------------------

function InfoRow({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2">
      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5 text-muted-foreground shrink-0" />
        <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider leading-none">
          {label}
        </span>
      </div>
      <div className="text-sm font-medium text-foreground truncate pl-5">{value}</div>
      {sub && (
        <div className="text-xs text-muted-foreground truncate pl-5">{sub}</div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section header — reusable small section title
// ---------------------------------------------------------------------------

function SectionHeader({
  icon: Icon,
  title,
  trailing,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  trailing?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
      <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5 text-primary" />
        {title}
      </h3>
      {trailing}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ClassOverviewPanel({
  classEntity,
  classInfo,
  teachers,
  isLoading,
  isPanelCollapsed,
  onTogglePanel,
}: ClassOverviewPanelProps) {
  // ── Loading state ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <aside className="w-72 lg:w-80 flex flex-col border-r bg-card shrink-0 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border-b">
            <div className="px-3 py-2 bg-muted/30">
              <Skeleton className="h-3.5 w-28" />
            </div>
            <div className="p-3 flex flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </aside>
    )
  }

  // ── Collapsed state (desktop only) ─────────────────────────────────
  if (isPanelCollapsed) {
    return (
      <aside className="flex shrink-0 w-10 border-r bg-card transition-all duration-300">
        <button
          onClick={onTogglePanel}
          className="flex flex-col items-center justify-center py-4 h-full w-full hover:bg-muted/50 transition-colors"
          title="Expand Overview Panel"
        >
          <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
            Class Overview
          </span>
        </button>
      </aside>
    )
  }

  // ── Data computation ───────────────────────────────────────────────

  let scheduleDays = '—'
  let infoStartTime = classInfo?.startTimeLocal
  let infoEndTime = classInfo?.endTimeLocal
  let infoStartDate = classInfo?.startDate
  let infoEndDate = classInfo?.endDate

  if (classInfo?.schedule) {
    if (typeof classInfo.schedule === 'string') {
      scheduleDays = classInfo.schedule
    } else if (typeof classInfo.schedule === 'object') {
      // Schedule can be a dynamic object with varying properties
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sObj = classInfo.schedule as any
      scheduleDays = sObj.format || '—'
      infoStartTime = infoStartTime || sObj.startTime
      infoEndTime = infoEndTime || sObj.endTime
      infoStartDate = infoStartDate || sObj.startDate
      infoEndDate = infoEndDate || sObj.endDate
    }
  }

  /** Extract HH:mm from ISO timestamp or return as-is if already short */
  function formatTime(raw: string | null | undefined): string {
    if (!raw) return '—'
    if (raw.length <= 5) return raw
    try {
      const d = new Date(raw)
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      }
    } catch { /* ignore */ }
    return raw
  }

  /** Extract dd/MM/yyyy from ISO or return as-is */
  function formatDate(raw: string | null | undefined): string {
    if (!raw) return '—'
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw
    try {
      const d = new Date(raw)
      if (!isNaN(d.getTime())) return d.toLocaleDateString('en-GB')
    } catch { /* ignore */ }
    return raw
  }

  const schedule = classEntity?.schedule
  const classTime = (infoStartTime && infoEndTime)
    ? `${infoStartTime} – ${infoEndTime}`
    : schedule
      ? `${formatTime(schedule.startTime)} – ${formatTime(schedule.endTime)}`
      : '—'
  const startDate = infoStartDate
    ? formatDate(infoStartDate)
    : formatDate(schedule?.startDate)
  const endDate = infoEndDate
    ? formatDate(infoEndDate)
    : formatDate(schedule?.endDate)

  // Room / campus from classInfo or fallback
  const roomName = classEntity?.name ?? classInfo?.class ?? '—'
  const campusName = classEntity?.level?.name ?? classInfo?.level ?? '—'

  // Progress — parse teachingProccess (remaining lessons as string)
  const totalLessons = classInfo?.numberOfStudents ?? 0
  const remaining = parseInt(classInfo?.teachingProccess ?? '0', 10) || 0
  const done = Math.max(0, totalLessons - remaining)
  const progressPercentage =
    totalLessons > 0 ? Math.round((done / totalLessons) * 100) : 0

  // Mock stats (will be replaced by API later)
  const mockStats = {
    renewalsReady: 3,
    missingReports: 2,
    attendanceTrend: [11, 12, 12, 11, 12, 10, 12, 12, 11, 12],
  }

  return (
    <aside className="w-72 lg:w-80 flex flex-col border-r bg-card shrink-0 overflow-y-auto transition-all duration-300">
      {/* ── Section 1: Schedule & Location (compact rows) ── */}
      <SectionHeader icon={Clock} title="Schedule" />
      <div className="flex flex-col divide-y divide-border border-b">
        <InfoRow
          icon={Clock}
          label="Class Time"
          value={
            <span className="text-xs tabular-nums">{scheduleDays} · {classTime}</span>
          }
        />
        <InfoRow
          icon={MapPin}
          label="Location"
          value={
            <span className="text-xs tabular-nums">Level {campusName} - {roomName}</span>
          }
        />
        <InfoRow
          icon={Calendar}
          label="Duration"
          value={
            <span className="text-xs tabular-nums">{startDate} – {endDate}</span>
          }
        />
      </div>

      {/* ── Section 2: Course Progress ── */}
      <SectionHeader
        icon={CheckCircle2}
        title="Course Progress"
        trailing={
          <span className="text-xs font-bold text-primary tabular-nums">
            {progressPercentage}%
          </span>
        }
      />
      <div className="px-3 py-2.5 flex flex-col gap-2 border-b">
        <Progress value={progressPercentage} className="h-1.5" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="size-3" />
            {done} Done
          </span>
          <span className="tabular-nums">Total: {totalLessons}</span>
        </div>
      </div>

      {/* ── Section 3: Teachers (with inline phone/email) ── */}
      <SectionHeader icon={Users} title="Teachers" />
      <div className="flex flex-col divide-y divide-border border-b">
        {teachers.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 text-center py-4 px-3">
            No teachers assigned
          </p>
        ) : (
          teachers.map((teacher) => (
            <div
              key={teacher.id}
              className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted/40 transition-colors"
            >
              <div className="relative size-9 shrink-0">
                <Avatar className="size-9 border border-background shadow-sm">
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                    {getInitials(teacher.fullName)}
                  </AvatarFallback>
                </Avatar>
                <Badge
                  variant="outline"
                  className={cn(
                    'absolute -bottom-0.5 -right-1 text-[8px] font-bold px-0.5 py-px rounded-sm bg-background leading-none',
                    teacher.isPrimary
                      ? 'text-primary border-primary/20'
                      : 'text-muted-foreground border-border',
                  )}
                >
                  {teacher.isPrimary ? 'MT' : 'CT'}
                </Badge>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-foreground truncate">
                  {teacher.englishName
                    ? `${teacher.englishName} - ${shortenName(teacher.fullName)}`
                    : shortenName(teacher.fullName)}
                  <Badge
                    variant="outline"
                    className={cn(
                      'ml-1.5 text-[8px] font-bold px-1 py-px rounded-sm leading-none',
                      teacher.isPrimary
                        ? 'text-primary border-primary/20'
                        : 'text-muted-foreground border-border',
                    )}
                  >
                    {teacher.isPrimary ? 'MT' : 'CT'}
                  </Badge>
                </div>
                {/* Phone & Email as inline text */}
                {teacher.phoneNumber && (
                  <a
                    href={`tel:${teacher.phoneNumber}`}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors mt-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone className="size-2.5 shrink-0" />
                    <span className="truncate">{teacher.phoneNumber}</span>
                  </a>
                )}
                {teacher.userName && teacher.userName.includes('@') && (
                  <a
                    href={`mailto:${teacher.userName}`}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Mail className="size-2.5 shrink-0" />
                    <span className="truncate">{teacher.userName}</span>
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Section 4: Stats & Trends (mock data) ── */}
      <div className="grid grid-cols-2 divide-x divide-border border-b">
        <div className="p-3 text-center">
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            {mockStats.renewalsReady}
          </div>
          <div className="text-[9px] uppercase font-bold text-muted-foreground">
            Renewals
          </div>
        </div>
        <div className="p-3 text-center">
          <div className="text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums">
            {mockStats.missingReports}
          </div>
          <div className="text-[9px] uppercase font-bold text-muted-foreground">
            Missing Rpts
          </div>
        </div>
      </div>

      {/* Attendance sparkline */}
      <div className="p-3">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
          <span className="flex items-center gap-1 font-bold uppercase">
            <TrendingUp className="size-3" /> Attendance
          </span>
          <span className="text-foreground font-bold">Last 10 Sess.</span>
        </div>
        <div className="h-8 w-full">
          <Sparkline data={mockStats.attendanceTrend} />
        </div>
      </div>
    </aside>
  )
}
