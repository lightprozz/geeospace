'use client'

// ---------------------------------------------------------------------------
// Permission Search — search input + filter buttons for permission grid
// ---------------------------------------------------------------------------

import { Search, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PERMISSION_GROUPS } from '@/features/lms/types/role'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PermissionSearchProps {
  value: string
  onChange: (value: string) => void
  group: string
  onGroupChange: (value: string) => void
  claimedOnly: boolean
  onClaimedOnlyChange: (value: boolean) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PermissionSearch({ value, onChange, group, onGroupChange, claimedOnly, onClaimedOnlyChange }: PermissionSearchProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-muted/10 p-3">
      <InputGroup className="h-8 min-w-32 flex-1">
        <InputGroupAddon>
          <InputGroupText>
            <Search className="h-4 w-4 text-muted-foreground" />
          </InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          aria-label="Search permissions"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search permissions..."
          className="text-sm"
        />
      </InputGroup>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={group} onValueChange={onGroupChange}>
          <SelectTrigger aria-label="Filter permission groups"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {PERMISSION_GROUPS.map(({ id, label }) => <SelectItem key={id} value={id}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant={claimedOnly ? 'secondary' : 'outline'} aria-pressed={claimedOnly} size="sm" onClick={() => onClaimedOnlyChange(!claimedOnly)}>
          <Lock className="h-3.5 w-3.5 mr-1.5" />
          Claimed Only
        </Button>
      </div>
    </div>
  )
}
