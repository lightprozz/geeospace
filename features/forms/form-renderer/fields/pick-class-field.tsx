"use client"
// ---------------------------------------------------------------------------
// components/form-renderer/fields/pick-class-field.tsx
// PickClass(11) — the ONE fully editable picker this round, wired to the
// existing class lookup (GET /api/v2/class/classes/dropdown). Value shape is
// `{ id, fullName }`, same as PickStudent(10); the lookup's `name` becomes
// `fullName`.
// ---------------------------------------------------------------------------

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useClassLookup } from "@/features/lms/hooks/classes/use-classes"
import { PERMISSIONS } from "@/lib/permissions"
import { useCan, usePermissionsLoaded } from "@/lib/use-can"
import { cn } from "@/lib/utils"
import { decode, type PersonEntry } from "@/features/lms/lib/requests/field-value"
import type { Field } from "@/features/lms/types/request"

import type { FieldInputProps, FieldReadOnlyProps } from "../field-props"

import { ReadOnlyValue } from "./read-only-value"

function selectedClass(field: Field, value: unknown): PersonEntry | null {
  const decoded = decode(field, value)
  if (
    decoded === null ||
    typeof decoded !== "object" ||
    Array.isArray(decoded)
  ) {
    return null
  }
  return decoded as PersonEntry
}

export function PickClassFieldInput({
  field,
  value,
  onChange,
  onBlur,
  disabled,
  inputId,
  describedBy,
  invalid,
  density,
}: FieldInputProps) {
  const [open, setOpen] = useState(false)
  const permissionsLoaded = usePermissionsLoaded()
  const canReadClasses = useCan(PERMISSIONS.CLASS_READ)
  // R-H5: only query the class lookup once the picker is actually opened, and
  // never for a user without `class.read` — a request submitter should not
  // trip a 403 just by opening a form.
  const { data: classes, isPending, isError } = useClassLookup(
    open && canReadClasses,
  )
  const selected = selectedClass(field, value)
  const isCompact = density === "compact"

  // Degraded mode: the user may open the form but cannot browse classes.
  if (permissionsLoaded && !canReadClasses) {
    return (
      <div className="space-y-1">
        <div
          className={cn(
            "flex w-full items-center rounded-md border border-input bg-muted/40 px-3 py-2 text-sm",
            isCompact ? "h-9" : "",
          )}
        >
          {selected?.fullName || (
            <span className="text-muted-foreground">
              Class selection unavailable
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          You do not have permission to browse classes. Ask an administrator to
          assign this field, or enter the class another way.
        </p>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={inputId}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-required={field.required || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          onBlur={onBlur}
          className={isCompact
            ? "h-9 w-full justify-between font-normal"
            : "w-full justify-between font-normal"}
        >
          {selected?.fullName || (
            <span className="text-muted-foreground">Select a class</span>
          )}
          <ChevronsUpDown
            className="ml-2 h-4 w-4 shrink-0 opacity-50"
            aria-hidden="true"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search class name..." />
          <CommandList>
            <CommandEmpty>
              {isPending
                ? "Loading classes…"
                : isError
                  ? "Class list unavailable."
                  : "No class found."}
            </CommandEmpty>
            <CommandGroup>
              {(classes ?? []).map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.name}
                  onSelect={() => {
                    onChange(
                      selected?.id === item.id
                        ? null
                        : { id: item.id, fullName: item.name }
                    )
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected?.id === item.id ? "opacity-100" : "opacity-0"
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function PickClassFieldReadOnly({ field, value }: FieldReadOnlyProps) {
  const selected = selectedClass(field, value ?? field.value)
  return <ReadOnlyValue text={selected?.fullName ?? ""} />
}
