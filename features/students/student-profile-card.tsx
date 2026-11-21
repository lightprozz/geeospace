'use client'

import {
  User,
  Calendar,
  BookOpen,
  Pencil,
  MapPin,
  GraduationCap,
  Tag,
} from 'lucide-react'

import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  getStudentInitials,
  formatStudentDate,
  CLASS_TYPE,
} from '@/features/lms/types/student'
import { useStudentPermission } from './panel-support'
import type { StudentDetail, StudentStatus } from '@/features/lms/types/student'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StudentProfileCardProps {
  student: StudentDetail
  currentClassName: string | null
  prevClassName: string | null
  status: StudentStatus
  /** Campus info from V2 API (campusId, campusName, campusAddress) */
  campusName?: string | null
  campusAddress?: string | null
  /** Level info from V2 API */
  levelName?: string | null
  /** Student type from V2 API (1-5) */
  currentStudentType?: number | null
  onEdit?: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get display label for student type */
function getStudentTypeLabel(type: number | null | undefined): string {
  if (type == null) return '—'
  switch (type) {
    case CLASS_TYPE.Regular: return 'Regular'
    case CLASS_TYPE.CatchUp: return 'CatchUp'
    case CLASS_TYPE.Demo: return 'Demo'
    case CLASS_TYPE.Suspended: return 'Suspended'
    case CLASS_TYPE.Terminated: return 'Terminated'
    default: return `Type ${type}`
  }
}

function getStudentTypeBadgeClass(type: number | null | undefined): string {
  if (type == null) return ''
  switch (type) {
    case CLASS_TYPE.Regular: return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
    case CLASS_TYPE.CatchUp: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800'
    case CLASS_TYPE.Demo: return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800'
    case CLASS_TYPE.Suspended: return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800'
    case CLASS_TYPE.Terminated: return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800'
    default: return ''
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StudentProfileCard({
  student,
  currentClassName,
  prevClassName,
  campusName,
  campusAddress,
  levelName,
  currentStudentType,
  onEdit,
}: StudentProfileCardProps) {
  const { can } = useStudentPermission()
  const canUpdateStudent = can('student.update')
  const initials = getStudentInitials(student.studentName)
  const typeLabel = getStudentTypeLabel(currentStudentType)
  const typeBadgeClass = getStudentTypeBadgeClass(currentStudentType)

  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-center justify-between border-b h-9 py-0 space-y-0">
        <CardTitle className="flex items-center gap-1.5 text-xs">
          <User className="size-3.5" />
          Student Info
        </CardTitle>
        {canUpdateStudent && (
          <CardAction className="self-center mt-0">
            <Button variant="ghost" size="icon" className="size-6" aria-label="Edit student" onClick={onEdit}>
              <Pencil />
            </Button>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-3 text-xs">
        {/* Avatar + Name */}
        <div className="flex items-center gap-3">
          <Avatar className="size-12 border-2 border-background shadow-sm shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate">{student.studentName ?? '—'}</p>
            {student.englishName && (
              <p className="text-[11px] text-muted-foreground truncate">{student.englishName}</p>
            )}
            {typeLabel && (
              <Badge variant="outline" className={`mt-1 text-[10px] ${typeBadgeClass}`}>
                {typeLabel}
              </Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* Current Class */}
        <div className="flex items-start gap-2">
          <GraduationCap className="size-3 mt-0.5 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-muted-foreground">Current Class</p>
            <p className="font-semibold truncate">{currentClassName ?? '—'}</p>
            {prevClassName && (
              <p className="text-[10px] text-muted-foreground">Prev: {prevClassName}</p>
            )}
          </div>
        </div>

        {/* Campus / Branch */}
        {(campusName || campusAddress) && (
          <div className="flex items-start gap-2">
            <MapPin className="size-3 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground">Campus / Branch</p>
              <p className="font-semibold truncate">{campusName}</p>
              {campusAddress && (
                <p className="text-[10px] text-muted-foreground truncate">{campusAddress}</p>
              )}
            </div>
          </div>
        )}

        {/* Level */}
        {levelName && (
          <div className="flex items-start gap-2">
            <Tag className="size-3 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground">Level</p>
              <p className="font-semibold truncate">{levelName}</p>
            </div>
          </div>
        )}

        <Separator />

        {/* Birthday */}
        <div className="flex justify-between">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Calendar className="size-3" />
            Birthday
          </span>
          <span className="font-medium tabular-nums">
            {formatStudentDate(student.birthday)}
          </span>
        </div>

        {/* EL Account */}
        <div className="flex justify-between">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <BookOpen className="size-3" />
            EL Account
          </span>
          {student.elAccount ? (
            <span className="font-medium text-foreground truncate max-w-[120px]">
              {student.elAccount}
            </span>
          ) : (
            <span className="font-medium text-muted-foreground italic">
              Not linked
            </span>
          )}
        </div>

        <Separator />

        {/* Traits */}
        <div className="flex flex-col gap-1 overflow-hidden">
          <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">
            Traits
          </span>
          {student.traits ? (
            <p className="w-fit max-w-full h-auto whitespace-normal break-words text-left text-[12px]">
              {student.traits}
            </p>
          ) : (
            <span className="text-muted-foreground italic text-[10px]">
              No traits recorded
            </span>
          )}
        </div>

        {student.note && (
          <>
            <Separator />
            <div className="flex flex-col gap-1 overflow-hidden">
              <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">
                Note
              </span>
              <p className="text-foreground text-[11px] leading-relaxed whitespace-pre-wrap break-words">
                {student.note}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
