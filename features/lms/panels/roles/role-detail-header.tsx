'use client'

// ---------------------------------------------------------------------------
// Role Detail Header — banner showing active role info + permission stats
// ---------------------------------------------------------------------------

import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import type { RoleListItem } from '@/features/lms/types/role'

// ---------------------------------------------------------------------------
// Color map (mirrors role-sidebar)
// ---------------------------------------------------------------------------

const ROLE_COLORS = [
  'bg-red-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-indigo-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-teal-500',
] as const

function getRoleColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return ROLE_COLORS[Math.abs(hash) % ROLE_COLORS.length]
}

// Role descriptions (static, as backend doesn't expose descriptions)
const ROLE_DESCRIPTIONS: Record<string, string> = {
  Admin: 'Full system access and management capabilities.',
  Teacher: 'Class management and curriculum access.',
  'Branch Admin': 'Can manage campus operations and reports.',
  'Acad Manager':
    'Curriculum development and student progress monitoring.',
  'Sale Manager': 'Sales pipeline and revenue management.',
  'Sale Executive': 'Sales operations and client outreach.',
  Planner: 'Schedule planning and resource allocation.',
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RoleDetailHeaderProps {
  role: RoleListItem
  permissionCount: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RoleDetailHeader({
  role,
  permissionCount,
}: RoleDetailHeaderProps) {
  const color = getRoleColor(role.name)
  const description =
    ROLE_DESCRIPTIONS[role.name] ??
    `${role.name} role with configured permissions.`

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-primary/10 bg-primary/5 p-4">
      <div
        className={cn(
          'h-12 w-12 shrink-0 rounded-xl flex items-center justify-center text-white text-xl font-black shadow-lg',
          color,
        )}
      >
        {role.name.charAt(0)}
      </div>

      <div className="flex-1">
        <h3 className="text-lg font-bold mb-0.5">{role.name}</h3>
        <p className="text-xs text-muted-foreground max-w-xl">
          {description}
        </p>
      </div>

      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-border p-2 px-3 rounded-lg shadow-sm">
        <div className="text-center pr-3 border-r border-border">
          <div className="text-base font-bold text-primary">
            {permissionCount}
          </div>
          <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-tighter">
            Permissions
          </div>
        </div>
        <Separator orientation="vertical" className="hidden" />
        <div className="text-center">
          <div className="text-base font-bold">{role.userCount}</div>
          <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-tighter">
            Active Users
          </div>
        </div>
      </div>
    </div>
  )
}
