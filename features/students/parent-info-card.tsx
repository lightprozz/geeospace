'use client'

import {
  Users,
  User,
  Phone,
  MapPin,
  Pencil,
} from 'lucide-react'

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { PARENT_RELATION_LABELS } from '@/features/lms/types/student'
import { useStudentPermission } from './panel-support'
import type { ParentInfo } from '@/features/lms/types/student'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ParentInfoCardProps {
  parents: ParentInfo[]
  address: string | null
  isLoading: boolean
  onEditFather?: () => void
  onEditMother?: () => void
}

// ---------------------------------------------------------------------------
// ParentEntry — reusable block for father/mother
// ---------------------------------------------------------------------------

function ParentEntry({
  label,
  parent,
  onEdit,
  canManageParent,
}: {
  label: string
  parent: ParentInfo | undefined
  onEdit?: () => void
  canManageParent: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          {label}
        </h4>
        {canManageParent && (
          <Button variant="ghost" size="icon" className="size-5" aria-label={`Edit ${label}`} onClick={onEdit}>
            <Pencil className="size-3" />
          </Button>
        )}
      </div>
      {parent ? (
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <User className="size-3 text-muted-foreground shrink-0" />
            <span className="truncate">{parent.name ?? '—'}</span>
          </div>
          {parent.phoneNumber && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="size-3 shrink-0" />
              <span className="tabular-nums">{parent.phoneNumber}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No info</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ParentInfoCard({ parents, address, isLoading, onEditFather, onEditMother }: ParentInfoCardProps) {
  const { can } = useStudentPermission()
  const canManageParent = can('student.parent.manage')
  const father = parents.find((p) => p.relation === 1)
  const mother = parents.find((p) => p.relation === 2)

  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-center justify-between border-b h-9 py-0 space-y-0">
        <CardTitle className="flex items-center gap-1.5 text-xs">
          <Users className="size-3.5" />
          Parents
        </CardTitle>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-32" />
            <Separator />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-32" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <ParentEntry
              label={PARENT_RELATION_LABELS[1]}
              parent={father}
              onEdit={onEditFather}
              canManageParent={canManageParent}
            />

            <Separator />

            <ParentEntry
              label={PARENT_RELATION_LABELS[2]}
              parent={mother}
              onEdit={onEditMother}
              canManageParent={canManageParent}
            />

            {/* Address */}
            {address && (
              <>
                <Separator />
                <div className="flex items-start gap-2 text-[10px] text-muted-foreground bg-muted/30 p-2 rounded-md">
                  <MapPin className="size-3 shrink-0 mt-0.5" />
                  <span>{address}</span>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
