'use client'
// ---------------------------------------------------------------------------
// _components/parent-edit-dialog.tsx
// Dialog for editing or adding parent info (Father/Mother)
//
// Flows (matching legacy StudentParent.js):
//   1. CREATE MODE (parentData=null):
//      a. Search & pick existing parent → link to student (fields read-only)
//      b. Type new name → create new parent
//   2. EDIT MODE (parentData exists):
//      a. Edit current parent fields directly → PUT update
//      b. Search & pick a DIFFERENT existing parent → re-link (fields read-only)
//      c. Clear & type new name → create new parent to replace
// ---------------------------------------------------------------------------

import { useEffect, useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Search, UserPlus, UserCheck, RefreshCw } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

import {
  useAllParents,
  useUpdateParent,
  useCreateParentForStudent,
  useLinkParentToStudent,
} from '@/features/lms/hooks/students/use-students'
import {
  ParentEditFormSchema,
  PARENT_RELATION_LABELS,
} from '@/features/lms/types/student'
import type { ParentEditFormInput, ParentInfo } from '@/features/lms/types/student'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ParentEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: string
  /** Existing parent data for this relation (null = no parent linked yet) */
  parentData: ParentInfo | null
  /** 1=Father, 2=Mother */
  relation: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ParentEditDialog({
  open,
  onOpenChange,
  studentId,
  parentData,
  relation,
}: ParentEditDialogProps) {
  const relationLabel = PARENT_RELATION_LABELS[relation] ?? 'Parent'
  const isEdit = !!parentData

  // ── Autocomplete state ──────────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  /**
   * Tracks which parent record the form is currently targeting:
   * - null + isEdit → editing currentParent (parentData) directly
   * - a different ParentInfo → user picked a different existing parent
   * - 'new' → user chose "Create new" to replace current parent
   */
  const [selectedExisting, setSelectedExisting] = useState<ParentInfo | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)

  // true when user picked a DIFFERENT existing parent (not the current one)
  const isLinkingDifferent =
    !!selectedExisting && selectedExisting.id !== parentData?.id

  // Fields are read-only when linking a different existing parent
  const fieldsDisabled = isLinkingDifferent

  // ── Data hooks ──────────────────────────────────────────────────────────
  const { data: allParents = [] } = useAllParents()
  const updateMutation = useUpdateParent(studentId)
  const createMutation = useCreateParentForStudent(studentId)
  const linkMutation = useLinkParentToStudent(studentId)

  // Filter parents by relation for autocomplete
  const filteredParents = useMemo(() => {
    const byRelation = allParents.filter((p) => p.relation === relation)
    if (!searchQuery.trim()) return byRelation
    const q = searchQuery.toLowerCase()
    return byRelation.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.phoneNumber?.includes(q),
    )
  }, [allParents, relation, searchQuery])

  // ── Form ────────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ParentEditFormInput>({
    // zodResolver requires type cast for complex schemas
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(ParentEditFormSchema) as any,
    defaultValues: {
      name: '',
      phoneNumber: '',
      email: '',
      address: '',
      job: '',
      yob: undefined,
      relation,
    },
  })

  // Reset everything when dialog opens
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedExisting(null)
       
      setIsCreatingNew(false)
       
      setSearchQuery('')
      if (parentData) {
        reset({
          name: parentData.name ?? '',
          phoneNumber: parentData.phoneNumber ?? '',
          email: parentData.email ?? '',
          address: parentData.address ?? '',
          job: parentData.job ?? '',
          yob: parentData.yob ?? undefined,
          relation: parentData.relation ?? relation,
        })
      } else {
        reset({
          name: '',
          phoneNumber: '',
          email: '',
          address: '',
          job: '',
          yob: undefined,
          relation,
        })
      }
    }
  }, [open, parentData, relation, reset])

  // ── Autocomplete handlers ───────────────────────────────────────────────

  /** User picked an existing parent from the dropdown */
  const handleSelectExisting = (parent: ParentInfo) => {
    setSelectedExisting(parent)
    setIsCreatingNew(false)
    setSearchOpen(false)
    // Fill form with selected parent's data
    setValue('name', parent.name ?? '')
    setValue('phoneNumber', parent.phoneNumber ?? '')
    setValue('email', parent.email ?? '')
    setValue('address', parent.address ?? '')
    setValue('job', parent.job ?? '')
    setValue('yob', parent.yob ?? undefined)
    setValue('relation', parent.relation)
  }

  /** User chose "Create new" → clear form and allow manual entry */
  const handleCreateNew = () => {
    setSelectedExisting(null)
    setIsCreatingNew(true)
    setSearchOpen(false)
    reset({
      name: searchQuery.trim(), // pre-fill with whatever they typed
      phoneNumber: '',
      email: '',
      address: '',
      job: '',
      yob: undefined,
      relation,
    })
  }

  /** User clicks "Reset to current" → restore original parent data */
  const handleResetToCurrent = () => {
    setSelectedExisting(null)
    setIsCreatingNew(false)
    setSearchQuery('')
    if (parentData) {
      reset({
        name: parentData.name ?? '',
        phoneNumber: parentData.phoneNumber ?? '',
        email: parentData.email ?? '',
        address: parentData.address ?? '',
        job: parentData.job ?? '',
        yob: parentData.yob ?? undefined,
        relation: parentData.relation ?? relation,
      })
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────
  const onSubmit = async (data: ParentEditFormInput) => {
    const payload: Record<string, unknown> = { ...data }

    if (isLinkingDifferent && selectedExisting) {
      // Case: User picked a DIFFERENT existing parent → re-link
      linkMutation.mutate(
        { parentId: selectedExisting.id, data: payload },
        { onSuccess: () => onOpenChange(false) },
      )
    } else if (isCreatingNew) {
      // Case: User is creating a brand new parent (replacing or first time)
      createMutation.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      })
    } else if (isEdit && parentData) {
      // Case: User edited the current parent's fields directly
      updateMutation.mutate(
        { parentId: parentData.id, data: payload },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      // Case: Create mode, no existing selected → create new
      createMutation.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      })
    }
  }

  const isPending =
    updateMutation.isPending ||
    createMutation.isPending ||
    linkMutation.isPending

  // ── Determine current display name for the search trigger ───────────────
  const searchDisplayName = isLinkingDifferent
    ? selectedExisting?.name
    : isCreatingNew
      ? 'Creating new...'
      : isEdit
        ? parentData?.name
        : null

  // ── Determine dialog title & submit label ───────────────────────────────
  let dialogTitle = isEdit ? `Edit ${relationLabel}` : `Add ${relationLabel}`
  let submitLabel = isEdit ? 'Save Changes' : `Add ${relationLabel}`

  if (isLinkingDifferent) {
    dialogTitle = `Change ${relationLabel}`
    submitLabel = `Link ${relationLabel}`
  } else if (isCreatingNew && isEdit) {
    dialogTitle = `Replace ${relationLabel}`
    submitLabel = `Create & Link`
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onOpenChange(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Update info, switch to an existing ${relationLabel.toLowerCase()}, or create a new one.`
              : `Search for an existing ${relationLabel.toLowerCase()} or create a new one.`}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 py-2"
        >
          {/* ── Autocomplete Search (ALWAYS visible) ── */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">
              {isEdit ? `Change ${relationLabel}` : `Search Existing ${relationLabel}`}
            </Label>
            <div className="flex items-center gap-2">
              <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={searchOpen}
                    className="flex-1 justify-start text-left font-normal h-9 text-sm"
                  >
                    <Search className="mr-2 size-3.5 shrink-0 opacity-50" />
                    {searchDisplayName ?? 'Search by name or phone...'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[340px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Type name or phone..."
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>
                        No existing {relationLabel.toLowerCase()} found.
                      </CommandEmpty>
                      <CommandGroup heading={`Existing ${relationLabel}s`}>
                        {filteredParents.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={p.id}
                            onSelect={() => handleSelectExisting(p)}
                            className="flex items-center justify-between"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">
                                {p.name}
                                {p.id === parentData?.id && (
                                  <span className="ml-1.5 text-[10px] text-muted-foreground">
                                    (current)
                                  </span>
                                )}
                              </span>
                              {p.phoneNumber && (
                                <span className="text-xs text-muted-foreground">
                                  {p.phoneNumber}
                                </span>
                              )}
                            </div>
                            <UserCheck className="size-4 text-muted-foreground" />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <CommandSeparator />
                      <CommandGroup>
                        <CommandItem onSelect={handleCreateNew}>
                          <UserPlus className="mr-2 size-4" />
                          <span>
                            Create new {relationLabel.toLowerCase()}
                            {searchQuery.trim() && ` "${searchQuery.trim()}"`}
                          </span>
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Reset button — only when user changed from current */}
              {isEdit && (isLinkingDifferent || isCreatingNew) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetToCurrent}
                  className="text-xs shrink-0"
                  title="Reset to current parent"
                >
                  <RefreshCw className="size-3.5" />
                </Button>
              )}
            </div>

            {/* Status badges */}
            {isLinkingDifferent && (
              <Badge variant="secondary" className="w-fit text-[10px]">
                <UserCheck className="mr-1 size-3" />
                Linking existing record — fields are read-only
              </Badge>
            )}
            {isCreatingNew && isEdit && (
              <Badge variant="outline" className="w-fit text-[10px] border-amber-500/40 text-amber-600">
                <UserPlus className="mr-1 size-3" />
                Creating new {relationLabel.toLowerCase()} to replace current
              </Badge>
            )}
          </div>

          {/* ── Form Fields ── */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="parent-name">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="parent-name"
              placeholder="Họ và tên phụ huynh"
              {...register('name')}
              aria-invalid={!!errors.name}
              disabled={fieldsDisabled}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="parent-phone">Phone Number</Label>
              <Input
                id="parent-phone"
                placeholder="0901234567"
                {...register('phoneNumber')}
                disabled={fieldsDisabled}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="parent-email">Email</Label>
              <Input
                id="parent-email"
                type="email"
                placeholder="email@example.com"
                {...register('email')}
                disabled={fieldsDisabled}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="parent-address">Address</Label>
            <Input
              id="parent-address"
              placeholder="Địa chỉ"
              {...register('address')}
              disabled={fieldsDisabled}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="parent-job">Occupation</Label>
              <Input
                id="parent-job"
                placeholder="Nghề nghiệp"
                {...register('job')}
                disabled={fieldsDisabled}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="parent-yob">Year of Birth</Label>
              <Input
                id="parent-yob"
                type="number"
                placeholder="1985"
                {...register('yob')}
                disabled={fieldsDisabled}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
