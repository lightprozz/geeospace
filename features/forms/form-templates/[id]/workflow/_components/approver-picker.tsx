'use client'
// ---------------------------------------------------------------------------
// approver-picker.tsx
// Approver selection for a workflow step, driven by the step's approval kind:
//   User        → multi-select from the form-builder users lookup
//   Role        → single-select from the roles lookup
//   GroupInHose / GroupAll → multi-select from the groups lookup
// The picked resources are written back as ApproverRef entries so the BE can
// persist them on the step.
// ---------------------------------------------------------------------------

import { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useDebouncedValue } from '@/features/forms/use-debounced-value'
import { cn } from '@/lib/utils'
import {
  getLookupGroups,
  getLookupRoles,
  getLookupUsers,
  type LookupGroupOption,
  type LookupRoleOption,
  type LookupUserOption,
} from '../lib/api'
import { TYPE_APPROVAL_ID } from '../types/workflow'
import type { ApproverRef } from '../types/workflow'

export const APPROVER_LOOKUP_KEYS = {
  users: (keyword: string) => ['lookups', 'users', keyword] as const,
  roles: (keyword: string) => ['lookups', 'roles', keyword] as const,
  groups: (keyword: string) => ['lookups', 'groups', keyword] as const,
}

interface Option {
  id: string
  label: string
  secondary?: string
}

/** Maps a step's approval kind onto the picker mode and lookup source. */
function pickerModeFor(typeApprovalId: number): {
  multiple: boolean
  source: 'users' | 'roles' | 'groups'
} {
  switch (typeApprovalId) {
    case TYPE_APPROVAL_ID.User:
      return { multiple: true, source: 'users' }
    case TYPE_APPROVAL_ID.Role:
      return { multiple: false, source: 'roles' }
    default:
      // GroupInHose and GroupAll both resolve against the group lookup.
      return { multiple: true, source: 'groups' }
  }
}

interface ApproverPickerProps {
  typeApprovalId: number
  value: ApproverRef[]
  onChange: (approvers: ApproverRef[]) => void
  disabled?: boolean
}

export function ApproverPicker({
  typeApprovalId,
  value,
  onChange,
  disabled,
}: ApproverPickerProps) {
  const [open, setOpen] = useState(false)
  const { multiple, source } = useMemo(
    () => pickerModeFor(typeApprovalId),
    [typeApprovalId],
  )

  const kind: ApproverRef['kind'] =
    source === 'users' ? 'User' : source === 'roles' ? 'Role' : 'Group'

  const [keyword, setKeyword] = useState('')
  const debouncedKeyword = useDebouncedValue(keyword, 300)

  // Labels for already-picked options are cached so a selection keeps its
  // human-readable name even when the current keyword no longer matches it.
  const [labelCache, setLabelCache] = useState(() => new Map<string, string>())

  const usersQuery = useQuery({
    queryKey: APPROVER_LOOKUP_KEYS.users(debouncedKeyword),
    queryFn: () => getLookupUsers(debouncedKeyword),
    enabled: source === 'users',
    staleTime: 5 * 60 * 1000,
  })

  const rolesQuery = useQuery({
    queryKey: APPROVER_LOOKUP_KEYS.roles(debouncedKeyword),
    queryFn: () => getLookupRoles(debouncedKeyword),
    enabled: source === 'roles',
    staleTime: 5 * 60 * 1000,
  })

  const groupsQuery = useQuery({
    queryKey: APPROVER_LOOKUP_KEYS.groups(debouncedKeyword),
    queryFn: () => getLookupGroups(debouncedKeyword),
    enabled: source === 'groups',
    staleTime: 5 * 60 * 1000,
  })

  const options: Option[] = useMemo(() => {
    if (source === 'users') {
      return ((usersQuery.data ?? []) as LookupUserOption[]).map((u) => ({
        id: u.id,
        label: u.fullName,
        secondary: u.email ?? u.userName ?? undefined,
      }))
    }
    if (source === 'roles') {
      return ((rolesQuery.data ?? []) as LookupRoleOption[]).map((r) => ({
        id: r.id,
        label: r.name,
      }))
    }
    return ((groupsQuery.data ?? []) as LookupGroupOption[]).map((g) => ({
      id: g.id,
      label: g.name,
      secondary: g.description ?? undefined,
    }))
  }, [source, usersQuery.data, rolesQuery.data, groupsQuery.data])

  // Remember the labels seen for the current result set.
  const [previousOptions, setPreviousOptions] = useState(options)
  if (previousOptions !== options) {
    setPreviousOptions(options)
    setLabelCache(new Map([...labelCache, ...options.map(option => [option.id, option.label] as const)]))
  }

  const selectedIds = useMemo(
    () => value.filter((a) => a.kind === kind).map((a) => a.resourceId),
    [value, kind],
  )

  const selectedLabels = useMemo(() => {
    return selectedIds.map(
      (id) =>
        options.find((o) => o.id === id)?.label ?? labelCache.get(id) ?? id,
    )
  }, [options, selectedIds, labelCache])

  const toggle = useCallback(
    (optionId: string) => {
      if (!multiple) {
        onChange([{ kind, resourceId: optionId }])
        setOpen(false)
        return
      }
      if (selectedIds.includes(optionId)) {
        onChange(
          value.filter(
            (a) => !(a.kind === kind && a.resourceId === optionId),
          ),
        )
      } else {
        onChange([...value, { kind, resourceId: optionId }])
      }
    },
    [multiple, kind, onChange, selectedIds, value],
  )

  const isLoading =
    (source === 'users' && usersQuery.isLoading) ||
    (source === 'roles' && rolesQuery.isLoading) ||
    (source === 'groups' && groupsQuery.isLoading)

  const isError =
    (source === 'users' && usersQuery.isError) ||
    (source === 'roles' && rolesQuery.isError) ||
    (source === 'groups' && groupsQuery.isError)

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="h-7 w-full justify-between px-2 text-xs font-normal"
          >
            <span
              className={cn(
                'truncate',
                selectedIds.length === 0 && 'text-muted-foreground',
              )}
            >
              {selectedIds.length === 0
                ? 'Chọn người duyệt…'
                : selectedLabels.join(', ')}
            </span>
            <ChevronDown className="size-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
        >
          {/* Filtering happens on the server via the keyword parameter, so the
              command palette must not re-filter the returned page itself. */}
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Tìm kiếm…"
              value={keyword}
              onValueChange={setKeyword}
            />
            <CommandList>
              <CommandEmpty>
                {isLoading ? 'Đang tải…' : 'Không tìm thấy kết quả.'}
              </CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const selected = selectedIds.includes(option.id)
                  return (
                    <CommandItem
                      key={option.id}
                      value={option.id}
                      onSelect={() => toggle(option.id)}
                    >
                      <Check
                        className={cn(
                          'size-3.5 shrink-0',
                          selected ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <span className="truncate">{option.label}</span>
                      {option.secondary ? (
                        <span className="ml-auto truncate text-[10px] text-muted-foreground">
                          {option.secondary}
                        </span>
                      ) : null}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
          {isError ? (
            <p className="px-2 py-1.5 text-[10px] text-destructive">
              Không tải được danh sách. Vui lòng thử lại.
            </p>
          ) : null}
        </PopoverContent>
      </Popover>

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {selectedLabels.map((label, index) => (
            <Badge
              key={selectedIds[index] ?? label}
              variant="secondary"
              className="gap-1 px-1.5 py-0 text-[10px] font-normal"
            >
              <span className="max-w-[140px] truncate">{label}</span>
              <button
                type="button"
                aria-label={`Bỏ ${label}`}
                onClick={() => {
                  const id = selectedIds[index]
                  if (!id) return
                  toggle(id)
                }}
                className="rounded-sm hover:text-destructive"
              >
                <X className="size-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  )
}
