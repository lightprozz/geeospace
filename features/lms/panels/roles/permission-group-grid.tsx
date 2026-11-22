'use client'

// ---------------------------------------------------------------------------
// Permission Group Grid — grouped permission toggles with Switch
// ---------------------------------------------------------------------------

import { useMemo } from 'react'
import {
  Shield,
  FileText,
  BookOpen,
  Globe,
  GraduationCap,
  Users,
  BarChart3,
  MessageSquare,
  ClipboardCheck,
  Monitor,
  Plug,
  ClipboardList,
  Clock,
  FileStack,
  Lock,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { PERMISSIONS } from '@/lib/permissions'
import {
  PERMISSION_GROUPS,
  getRolePermissionKeys,
  formatPermissionDisplayName,
  getPermissionGroup,
} from '@/features/lms/types/role'
import type { RolePermissionInfo } from '@/features/lms/types/role'
import type { LucideIcon } from 'lucide-react'

const permissionKeys = getRolePermissionKeys(PERMISSIONS)

// ---------------------------------------------------------------------------
// Icon registry — maps icon string name → lucide component
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, LucideIcon> = {
  Shield,
  FileText,
  BookOpen,
  Globe,
  GraduationCap,
  Users,
  BarChart3,
  MessageSquare,
  ClipboardCheck,
  Monitor,
  Plug,
  ClipboardList,
  Clock,
  FileStack,
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PermissionGroupGridProps {
  grantedPermissions: RolePermissionInfo[]
  searchQuery: string
  group: string
  claimedOnly: boolean
  onToggle: (claimValue: string, granted: boolean, claimId?: string) => void
  isPending: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PermissionGroupGrid({
  grantedPermissions,
  searchQuery,
  group,
  claimedOnly,
  onToggle,
  isPending,
}: PermissionGroupGridProps) {
  // Build a lookup map: claimValue → RolePermissionInfo
  const grantedMap = useMemo(() => {
    const map = new Map<string, RolePermissionInfo>()
    for (const p of grantedPermissions) {
      map.set(p.claimValue, p)
    }
    return map
  }, [grantedPermissions])

  // Group permission keys by their prefix, filtered by search
  const groupedPermissions = useMemo(() => {
    const result: Record<string, string[]> = {}

    const search = searchQuery.trim().toLowerCase()
    for (const key of permissionKeys) {
      const groupKey = getPermissionGroup(key)
      if (group !== 'all' && group !== groupKey) continue
      if (claimedOnly && !grantedMap.has(key)) continue
      if (!key.toLowerCase().includes(search) && !formatPermissionDisplayName(key).toLowerCase().includes(search)) continue
      const items = result[groupKey] ??= []
      items.push(key)
    }

    return result
  }, [searchQuery, group, claimedOnly, grantedMap])

  // Check if any results exist after filtering
  const hasResults = Object.values(groupedPermissions).some(
    (items) => items.length > 0,
  )

  if (!hasResults) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <h4 className="text-lg font-semibold mb-1">No permissions found</h4>
        <p className="text-muted-foreground text-sm max-w-xs">
          No entries match your search criteria. Try a different term or clear
          the filter.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-5 @lg/permissions:grid-cols-2 @2xl/permissions:grid-cols-3">
      {PERMISSION_GROUPS.map((group) => {
        const groupItems = groupedPermissions[group.id] || []
        const GroupIcon = ICON_MAP[group.icon] ?? Shield

        if (groupItems.length === 0) return null

        return (
          <div key={group.id} className="flex flex-col gap-4">
            {/* Group header */}
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <div className={cn('p-2 rounded-lg bg-current/10', group.colorClass)}>
                <GroupIcon className="h-4 w-4" />
              </div>
              <h4 className="font-bold text-sm">{group.label}</h4>
              <Badge
                variant="secondary"
                className="ml-auto text-[10px] font-bold"
              >
                {groupItems.length} Available
              </Badge>
            </div>

            {/* Permission items */}
            <div className="space-y-2">
              {groupItems.map((item) => {
                const grantedInfo = grantedMap.get(item)
                const isGranted = !!grantedInfo
                const displayName = formatPermissionDisplayName(item)

                return (
                  <div
                    key={item}
                    className={cn(
                      'w-full group flex items-center justify-between p-2.5 rounded-lg border transition-all',
                      isGranted
                        ? 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                        : 'bg-background border-border hover:border-primary/30 hover:bg-muted/30',
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Switch
                        aria-label={item}
                        size="sm"
                        checked={isGranted}
                        disabled={isPending}
                        onCheckedChange={() =>
                          onToggle(item, isGranted, grantedInfo?.claimId)
                        }
                      />
                      <div className="flex flex-col min-w-0">
                        <span
                          className={cn(
                            'text-xs font-medium transition-colors',
                            isGranted ? 'text-primary' : 'text-foreground',
                          )}
                        >
                          {displayName}
                        </span>
                        <code className="text-[9px] text-muted-foreground tracking-tight truncate">
                          {item}
                        </code>
                      </div>
                    </div>

                    {isGranted ? (
                      <div className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-primary uppercase">
                        Access <Lock className="h-3 w-3" />
                      </div>
                    ) : (
                      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium text-muted-foreground/50 italic">
                        Not defined
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
