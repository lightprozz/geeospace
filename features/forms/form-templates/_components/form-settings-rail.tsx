'use client'
// ---------------------------------------------------------------------------
// _components/form-settings-rail.tsx
// Left rail of the form builder. Owns every template-level setting and
// persists each through the V2 template contract:
//   Active status  → toggle-activate (its own endpoint)
//   Turnaround SLA → FormTemplate.ExpirationCycle (hours)
//   Campuses       → FormTemplateCampuses
//   Visible To     → FormTemplateGroups
//   Auto-Watchers  → FormTemplateWatchers
// ---------------------------------------------------------------------------

import * as React from 'react'
import { Check, Clock, Eye, Folder, Layers, Plus, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCollections } from '@/features/lms/hooks/form-templates/use-collections'
import {
  useLookupCampuses,
  useLookupGroups,
  useLookupUsers,
} from '../hooks/use-template-lookups'
import type { LookupCampus, LookupGroup, LookupUser } from '@/features/lms/types/form-template'

/** A selected picker option. `id` is what gets persisted; `label` is display. */
export interface SettingsChip {
  id: string
  label: string
  /** Secondary line shown in the dropdown (email, description, address). */
  hint?: string
  /** Watcher identity — carried through so the saved watcher keeps its login. */
  email?: string
  userName?: string
}

export interface FormSettingsValue {
  /** null = no expiry configured. */
  slaHours: number | null
  isActive: boolean
  /** null = the template is not filed under a collection. */
  collectionId: string | null
  /** Display name of the collection; shown instead of the picker in read-only mode. */
  collectionName?: string | null
  campuses: SettingsChip[]
  visibleTo: SettingsChip[]
  watchers: SettingsChip[]
}

export const DEFAULT_SETTINGS: FormSettingsValue = {
  slaHours: 48,
  isActive: true,
  collectionId: null,
  campuses: [],
  visibleTo: [],
  watchers: [],
}

export function FormSettingsRail({
  value,
  onChange,
  isLoading,
  isSaving,
  readOnly = false,
}: {
  value: FormSettingsValue
  onChange: (value: FormSettingsValue) => void
  isLoading?: boolean
  isSaving?: boolean
  /**
   * Read-only surfaces (the template detail view) render the rail as a static
   * summary: the pickers stay closed, the inputs are disabled and the lookup
   * endpoints are never queried.
   */
  readOnly?: boolean
}) {
  // The picker sources are searched on the server: each keyword produces its
  // own query, so the rail keeps one keyword per picker.
  const [campusKeyword, setCampusKeyword] = React.useState('')
  const [groupKeyword, setGroupKeyword] = React.useState('')
  const [userKeyword, setUserKeyword] = React.useState('')

  const campusesQuery = useLookupCampuses(campusKeyword, !readOnly)
  const groupsQuery = useLookupGroups(groupKeyword, !readOnly)
  const usersQuery = useLookupUsers(userKeyword, !readOnly)
  const collectionsQuery = useCollections(!readOnly)

  const update = <K extends keyof FormSettingsValue>(
    key: K,
    next: FormSettingsValue[K],
  ) => {
    onChange({ ...value, [key]: next })
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      {/* Active status — persisted immediately through its own endpoint */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Trạng thái</Label>
          <p className="text-[10px] text-muted-foreground">Cho phép gửi biểu mẫu</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={value.isActive}
          aria-label="Trạng thái hoạt động"
          disabled={isSaving || readOnly}
          onClick={() => update('isActive', !value.isActive)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            value.isActive ? 'bg-primary' : 'bg-input'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition-transform ${
              value.isActive ? 'translate-x-[18px]' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Turnaround SLA → ExpirationCycle (hours) */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Clock className="mr-1 inline h-3 w-3" />
          Turnaround SLA
        </Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            placeholder="—"
            value={value.slaHours ?? ''}
            onChange={(e) => {
              const raw = e.target.value
              // Empty means "no expiry", which the backend stores as null.
              update('slaHours', raw === '' ? null : Number.parseInt(raw, 10))
            }}
            disabled={readOnly}
            className="h-9"
          />
          <span className="text-sm text-muted-foreground">Hours</span>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Leave empty for no expiry.
        </p>
      </div>

      {/* Collection — the template's filing folder */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Folder className="mr-1 inline h-3 w-3" />
          Collection
        </Label>
        {readOnly ? (
          <p className="text-sm text-foreground">
            {value.collectionName ?? 'Không thuộc collection'}
          </p>
        ) : (
          <Select
            value={value.collectionId ?? 'none'}
            onValueChange={(v) =>
              update('collectionId', v === 'none' ? null : v)
            }
            disabled={collectionsQuery.isLoading}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Không thuộc collection" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Không thuộc collection</SelectItem>
              {(collectionsQuery.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Available Campuses */}
      <ChipPicker
        label="Cơ sở áp dụng"
        icon={<Layers className="mr-1 inline h-3 w-3" />}
        selected={value.campuses}
        onChange={(next) => update('campuses', next)}
        onSearch={setCampusKeyword}
        options={(campusesQuery.data ?? []).map(toCampusChip)}
        isLoading={campusesQuery.isLoading}
        isError={campusesQuery.isError}
        emptyText="Không tìm thấy cơ sở"
        searchPlaceholder="Tìm cơ sở…"
        emptyLabel="Chưa chọn cơ sở"
        readOnly={readOnly}
      />

      {/* Visible To */}
      <ChipPicker
        label="Phạm vi hiển thị"
        selected={value.visibleTo}
        onChange={(next) => update('visibleTo', next)}
        onSearch={setGroupKeyword}
        options={(groupsQuery.data ?? []).map(toGroupChip)}
        isLoading={groupsQuery.isLoading}
        isError={groupsQuery.isError}
        emptyText="Không tìm thấy nhóm"
        searchPlaceholder="Tìm nhóm…"
        emptyLabel="Chưa chọn nhóm"
        readOnly={readOnly}
      />

      {/* Auto-Watchers */}
      <ChipPicker
        label="Người theo dõi"
        icon={<Eye className="mr-1 inline h-3 w-3" />}
        selected={value.watchers}
        onChange={(next) => update('watchers', next)}
        onSearch={setUserKeyword}
        options={(usersQuery.data ?? []).map(toUserChip)}
        isLoading={usersQuery.isLoading}
        isError={usersQuery.isError}
        emptyText="Không tìm thấy người dùng"
        searchPlaceholder="Tìm người dùng…"
        emptyLabel="Chưa thêm người theo dõi"
        accent
        readOnly={readOnly}
      />
    </div>
  )
}

function toCampusChip(c: LookupCampus): SettingsChip {
  return { id: c.id, label: c.name, hint: c.address ?? undefined }
}

function toGroupChip(g: LookupGroup): SettingsChip {
  return { id: g.id, label: g.name, hint: g.description ?? undefined }
}

function toUserChip(u: LookupUser): SettingsChip {
  return {
    id: u.id,
    label: u.fullName,
    hint: u.email ?? u.userName ?? undefined,
    email: u.email ?? undefined,
    userName: u.userName ?? undefined,
  }
}

/**
 * Multi-select rendered as removable chips plus a searchable dropdown. The
 * selected list is authoritative for what gets saved; the option list only
 * supplies labels for newly added entries.
 *
 * The search is a SERVER search: the picker debounces what the user types
 * and hands the keyword to `onSearch`, which re-queries the lookup endpoint.
 * Because the list is already filtered by the server, the `Command` palette
 * must not filter it again (`shouldFilter={false}`) and each item's value is
 * the stable id rather than the display label.
 */
function ChipPicker({
  label,
  icon,
  selected,
  onChange,
  onSearch,
  options,
  isLoading,
  isError,
  emptyText,
  searchPlaceholder,
  emptyLabel,
  accent = false,
  readOnly = false,
}: {
  label: string
  icon?: React.ReactNode
  selected: SettingsChip[]
  onChange: (next: SettingsChip[]) => void
  /** Receives the debounced keyword typed in the search box. */
  onSearch: (keyword: string) => void
  options: SettingsChip[]
  isLoading?: boolean
  isError?: boolean
  emptyText: string
  searchPlaceholder: string
  emptyLabel: string
  accent?: boolean
  /** Read-only surfaces show the chips without the remove button or the picker. */
  readOnly?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectedIds = React.useMemo(
    () => new Set(selected.map((c) => c.id)),
    [selected],
  )

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleSearchChange = React.useCallback(
    (value: string) => {
      setSearch(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => onSearch(value), 300)
    },
    [onSearch],
  )

  const add = (chip: SettingsChip) => {
    if (selectedIds.has(chip.id)) return
    onChange([...selected, chip])
  }

  const remove = (id: string) => {
    onChange(selected.filter((c) => c.id !== id))
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </Label>

      <div className="flex min-h-[40px] flex-wrap items-center gap-1.5 rounded-md border border-input bg-muted/10 p-2 shadow-sm">
        {selected.length === 0 ? (
          <span className="px-1 text-xs text-muted-foreground">{emptyLabel}</span>
        ) : (
          selected.map((chip) => (
            <span
              key={chip.id}
              className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium shadow-sm ${
                accent
                  ? 'border-primary/20 bg-primary/10 text-primary'
                  : 'border-border bg-background text-foreground'
              }`}
              title={chip.hint ?? chip.label}
            >
              {accent ? <Users className="h-3 w-3" /> : null}
              {chip.label}
              {readOnly ? null : (
                <button
                  type="button"
                  onClick={() => remove(chip.id)}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                  aria-label={`Xoá ${chip.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))
        )}

        {readOnly ? null : (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 border border-dashed border-border px-2 text-xs text-muted-foreground hover:text-primary"
              >
                <Plus className="mr-1 h-3 w-3" />
                Thêm
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder={searchPlaceholder}
                  value={search}
                  onValueChange={handleSearchChange}
                />
                <CommandList>
                  {isLoading ? (
                    <div className="space-y-1 p-2">
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-5 w-full" />
                    </div>
                  ) : isError ? (
                    <p className="p-3 text-xs text-destructive">
                      Không tải được danh sách. Thử lại.
                    </p>
                  ) : options.length === 0 ? (
                    <CommandEmpty>{emptyText}</CommandEmpty>
                  ) : (
                    <CommandGroup>
                      {options.map((chip) => {
                        const isSelected = selectedIds.has(chip.id)
                        return (
                          <CommandItem
                            key={chip.id}
                            value={chip.id}
                            disabled={isSelected}
                            onSelect={() => {
                              add(chip)
                              setOpen(false)
                            }}
                          >
                            <Check
                              className={`h-3.5 w-3.5 ${isSelected ? 'opacity-100' : 'opacity-0'}`}
                            />
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate">{chip.label}</span>
                              {chip.hint ? (
                                <span className="truncate text-[10px] text-muted-foreground">
                                  {chip.hint}
                                </span>
                              ) : null}
                            </span>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  )
}
