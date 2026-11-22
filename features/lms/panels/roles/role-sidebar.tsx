'use client'

// ---------------------------------------------------------------------------
// Role Sidebar — left panel showing system roles with selection
// ---------------------------------------------------------------------------

import { Lock, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import type { RoleListItem } from '@/features/lms/types/role'

// ---------------------------------------------------------------------------
// Color map — deterministic role avatar color based on role name
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

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RoleSidebarProps {
  roles: RoleListItem[]
  selectedRoleId: string | null
  onSelectRole: (id: string) => void
  isLoading: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RoleSidebar({
  roles,
  selectedRoleId,
  onSelectRole,
  isLoading,
}: RoleSidebarProps) {
  return (
    <Card className="flex max-h-[36%] min-h-0 w-full shrink-0 flex-col gap-0 overflow-hidden py-0 @2xl/management:max-h-none @2xl/management:w-56">
      <CardHeader className="p-4 border-b border-border bg-muted/20">
        <h3 className="font-semibold text-sm mb-1">System Roles</h3>
        <p className="text-xs text-muted-foreground">
          Select a role to modify its permissions.
        </p>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-2 space-y-1">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))
              : roles.map((role) => {
                  const isActive = selectedRoleId === role.id
                  const color = getRoleColor(role.name)
                  return (
                    <Button
                      key={role.id}
                      variant="ghost"
                      aria-pressed={isActive}
                      onClick={() => onSelectRole(role.id)}
                      className={cn(
                        'w-full h-auto justify-start gap-3 p-3 rounded-lg text-left group',
                        isActive &&
                          'bg-primary/10 border border-primary/20 shadow-sm ring-1 ring-primary/10',
                        !isActive && 'border border-transparent',
                      )}
                    >
                      <div
                        className={cn(
                          'h-8 w-8 shrink-0 rounded-md flex items-center justify-center text-white font-bold text-xs ring-2 ring-white dark:ring-slate-900 shadow-sm',
                          color,
                        )}
                      >
                        {role.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              'text-sm font-medium truncate',
                              isActive ? 'text-primary' : 'text-foreground',
                            )}
                          >
                            {role.name}
                          </span>
                          {isActive && (
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider mt-0.5">
                          {role.userCount} Members
                        </div>
                      </div>
                      {!isActive && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </Button>
                  )
                })}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="p-4 border-t border-border bg-muted/10">
        <Button
          variant="outline"
          className="w-full border-dashed text-muted-foreground"
        >
          <Lock className="h-3.5 w-3.5 mr-2" />
          Manage Global Security
        </Button>
      </CardFooter>
    </Card>
  )
}
