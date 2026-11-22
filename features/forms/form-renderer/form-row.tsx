"use client"
// ---------------------------------------------------------------------------
// components/form-renderer/form-row.tsx
// Layout primitives for the form renderer. The grid is ALWAYS two columns
// from `md` up; a field that must own the whole row says so through its
// `width` and spans both columns.
//
// Why spans instead of JS pairing:
//   - the grid does the flow, so no separate row-building step can drift
//     from the classes that render it
//   - a `full` field after a `short` one always starts a new row, because a
//     two-column item cannot fit in the single remaining column
//
// Density semantics:
//   - "compact"    → h-9 input (36px), label text-xs, two-column pairing
//   - "comfortable"→ h-7 input (28px), label text-sm, one column
//
// Touch-target note: 36px and 28px both fail WCAG 2.1's 44px recommendation,
// so the FormRow grows a `min-h-[44px]` shell on touch devices only (detected
// via `(hover: none)`) without changing the visible input height.
// ---------------------------------------------------------------------------

import * as React from "react"
import { cn } from "@/lib/utils"

export type FormRowWidth = "short" | "full"

export interface FormRowProps {
  /** `short` = shares the row with the next short sibling. `full` = whole row. */
  width?: FormRowWidth
  className?: string
  children: React.ReactNode
}

/**
 * Layout shell for a single form field. Not a <label> wrapper — the renderer
 * supplies the label through aria-labelledby/aria-describedby; this just
 * controls column placement and density.
 */
export function FormRow({
  width = "full",
  className,
  children,
}: FormRowProps) {
  return (
    <div
      data-width={width}
      className={cn(
        // Touch-target compensation: on a device without hover the tap
        // target must be ≥44px even though the visible input is shorter.
        // Pointer devices keep the design height.
        "[@media(hover:none)]:min-h-[44px]",
        // A `full` field owns the whole row of the two-column grid.
        width === "full" ? "md:col-span-2" : undefined,
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * Container that arranges the fields into two columns from `md` up. A field
 * that spans both columns (see `FormRow`) starts its own row.
 */
export function FormGrid({
  density = "comfortable",
  className,
  children,
}: {
  density?: "compact" | "comfortable"
  className?: string
  children: React.ReactNode
}) {
  const isCompact = density === "compact"
  return (
    <div
      data-density={density}
      className={cn(
        // Mobile: always 1 col. Desktop ≥ md: 2 col for compact density.
        // A `full` field spans both columns, so in comfortable density every
        // field occupies a full row and the original single-column spacing
        // (gap-y-3) is preserved.
        "grid grid-cols-1 gap-x-4 gap-y-3",
        isCompact && "md:grid-cols-2 md:gap-x-5 md:gap-y-4",
        className,
      )}
    >
      {children}
    </div>
  )
}
